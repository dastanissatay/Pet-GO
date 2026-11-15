import hashlib
import random
import uuid
from collections.abc import Sequence
from datetime import date, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.core.reference_data import QuestRow, ReferenceData, get_reference_data
from app.core.types import Cadence
from app.features.pets import service as pets_service
from app.features.pets.models import Pet
from app.features.quests import repository
from app.features.quests.models import QuestCompletion
from app.features.quests.schemas import (
    ProgressRead,
    QuestCompleteResult,
    QuestRead,
    QuestsRead,
    TypicalCost,
)
from app.features.users.models import User

# (level, total XP needed to reach it). Spec section 7, game rules.
LEVELS = ((1, 0), (2, 100), (3, 300))
# The browser's date may differ from the server's UTC date by time zone, never more.
MAX_LOCAL_DATE_SKEW_DAYS = 1
# Daily quests shown per day. The rest of the daily pool rotates in on later days.
DAILY_QUESTS_PER_DAY = 3


def period_key(cadence: Cadence, local_date: date) -> str:
    """'2026-11-14' daily, ISO week '2026-W46' weekly, '2026-11' monthly."""
    if cadence == "daily":
        return local_date.isoformat()
    if cadence == "monthly":
        return f"{local_date.year}-{local_date.month:02d}"
    iso = local_date.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def level_for_xp(xp: int) -> tuple[int, int | None]:
    """Return (level, xp needed for the next level or None at the top)."""
    level = 1
    for number, threshold in LEVELS:
        if xp >= threshold:
            level = number
    following = [threshold for number, threshold in LEVELS if number == level + 1]
    return level, (following[0] if following else None)


def compute_streak(days: set[date], today: date) -> int:
    """Consecutive days with a completed quest, counted back from today.

    If nothing is done yet today, the streak still counts from yesterday, so it only
    breaks once a whole day is missed.
    """
    day = today if today in days else today - timedelta(days=1)
    streak = 0
    while day in days:
        streak += 1
        day -= timedelta(days=1)
    return streak


def personalize(text: str, pet_name: str) -> str:
    """Quest copy in quests.json may say {name}; show the pet's name instead."""
    return text.replace("{name}", pet_name)


def check_local_date(local_date: date, today_utc: date) -> None:
    if abs((local_date - today_utc).days) > MAX_LOCAL_DATE_SKEW_DAYS:
        raise UnprocessableError(
            "The date from your device looks wrong.",
            code="INVALID_LOCAL_DATE",
            details={"fields": [{"field": "local_date", "message": "Use today's date."}]},
        )


def quests_for(data: ReferenceData, species: str) -> list[QuestRow]:
    return [quest for quest in data.quests if quest.species in (species, "both")]


def _shuffled(ids: Sequence[str], seed: str, cycle: int) -> list[str]:
    digest = hashlib.sha256(f"{seed}:{cycle}".encode()).digest()
    order = sorted(ids)
    # A repeatable shuffle for picking quests, not a secret: S311 does not apply.
    rng = random.Random(int.from_bytes(digest[:8], "big"))  # noqa: S311
    rng.shuffle(order)
    return order


def _cycle_order(ids: Sequence[str], seed: str, cycle: int, per_day: int, days: int) -> list[str]:
    """The pool order for one cycle, fixed so its first day avoids the previous cycle's last day.

    Only the first day and the middle days are rearranged; the last day keeps its
    shuffled picks, so the fix for the next cycle never depends on this one's fix.
    """
    order = _shuffled(ids, seed, cycle)[: days * per_day]
    previous_last = set(_shuffled(ids, seed, cycle - 1)[(days - 1) * per_day : days * per_day])
    middle = range(per_day, (days - 1) * per_day)
    spare = [i for i in middle if order[i] not in previous_last]
    for first in range(per_day):
        if order[first] in previous_last:
            swap = spare.pop(0)
            order[first], order[swap] = order[swap], order[first]
    return order


def daily_pick(
    ids: Sequence[str], seed: str, local_date: date, per_day: int = DAILY_QUESTS_PER_DAY
) -> set[str]:
    """Pick today's daily quests: random-looking, stable for the day, no repeat from yesterday.

    Days are grouped into cycles of len(ids) // per_day days. Each cycle shuffles the pool
    (seeded by the pet and the cycle) and hands out per_day quests a day, so every quest
    comes up once per cycle and no quest repeats on two days in a row.
    """
    if len(ids) <= per_day:
        return set(ids)
    days = len(ids) // per_day
    if days < 3:
        # Too few quests to promise no repeats; still vary them day to day.
        return set(_shuffled(ids, seed, local_date.toordinal())[:per_day])
    cycle, slot = divmod(local_date.toordinal(), days)
    order = _cycle_order(ids, seed, cycle, per_day, days)
    return set(order[slot * per_day : (slot + 1) * per_day])


def _find_quest(data: ReferenceData, pet: Pet, quest_id: str) -> QuestRow:
    for quest in quests_for(data, pet.species):
        if quest.id == quest_id:
            return quest
    raise NotFoundError("We could not find that quest.", code="QUEST_NOT_FOUND")


def _typical_cost(data: ReferenceData, quest: QuestRow) -> TypicalCost | None:
    if quest.related_price_id is None:
        return None
    row = data.prices_by_id[quest.related_price_id]
    return TypicalCost(
        price_id=row.id,
        name=row.name,
        low=int(row.low),
        high=int(row.high),
        source_url=row.source_url,
    )


async def _progress(session: AsyncSession, pet_id: uuid.UUID, local_date: date) -> ProgressRead:
    xp = await repository.total_xp(session, pet_id)
    level, next_level_xp = level_for_xp(xp)
    # A streak can only grow by one per day, so a year back is always enough.
    days = await repository.completion_days_since(session, pet_id, local_date - timedelta(days=400))
    return ProgressRead(
        xp=xp,
        level=level,
        stage=level,
        next_level_xp=next_level_xp,
        streak=compute_streak(days, local_date),
    )


async def list_quests(
    session: AsyncSession, user: User, pet_id: uuid.UUID, local_date: date, today_utc: date
) -> QuestsRead:
    check_local_date(local_date, today_utc)
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    data = get_reference_data()
    pool = quests_for(data, pet.species)
    daily_ids = [quest.id for quest in pool if quest.cadence == "daily"]
    today = daily_pick(daily_ids, str(pet.id), local_date)
    quests = [quest for quest in pool if quest.cadence != "daily" or quest.id in today]
    keys = {period_key(quest.cadence, local_date) for quest in quests}
    done = await repository.completed_quest_ids(session, pet.id, keys)

    def to_read(quest: QuestRow) -> QuestRead:
        return QuestRead(
            id=quest.id,
            title=personalize(quest.title, pet.name),
            cadence=quest.cadence,
            xp=quest.xp,
            why=personalize(quest.why, pet.name),
            completed=(quest.id, period_key(quest.cadence, local_date)) in done,
            typical_cost=_typical_cost(data, quest),
        )

    return QuestsRead(
        daily=[to_read(q) for q in quests if q.cadence == "daily"],
        weekly=[to_read(q) for q in quests if q.cadence == "weekly"],
        monthly=[to_read(q) for q in quests if q.cadence == "monthly"],
    )


async def get_progress(
    session: AsyncSession, user: User, pet_id: uuid.UUID, local_date: date, today_utc: date
) -> ProgressRead:
    check_local_date(local_date, today_utc)
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    return await _progress(session, pet.id, local_date)


async def complete_quest(
    session: AsyncSession,
    user: User,
    pet_id: uuid.UUID,
    quest_id: str,
    local_date: date,
    today_utc: date,
) -> QuestCompleteResult:
    check_local_date(local_date, today_utc)
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    quest = _find_quest(get_reference_data(), pet, quest_id)
    key = period_key(quest.cadence, local_date)
    already_done = ConflictError(
        "This quest is already done for this period.", code="QUEST_ALREADY_COMPLETED"
    )
    if await repository.exists(session, pet.id, quest.id, key):
        raise already_done

    before = await _progress(session, pet.id, local_date)
    try:
        await repository.add(
            session,
            QuestCompletion(
                pet_id=pet.id,
                quest_id=quest.id,
                period_key=key,
                completed_on=local_date,
                xp=quest.xp,
            ),
        )
        await session.commit()
    except IntegrityError as exc:
        # Two taps at once: the unique constraint caught the second one.
        await session.rollback()
        raise already_done from exc

    after = await _progress(session, pet.id, local_date)
    return QuestCompleteResult(progress=after, leveled_up=after.level > before.level)


async def undo_quest(
    session: AsyncSession,
    user: User,
    pet_id: uuid.UUID,
    quest_id: str,
    local_date: date,
    today_utc: date,
) -> None:
    check_local_date(local_date, today_utc)
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    quest = _find_quest(get_reference_data(), pet, quest_id)
    removed = await repository.remove(
        session, pet.id, quest.id, period_key(quest.cadence, local_date)
    )
    if removed == 0:
        raise NotFoundError("This quest is not done for this period.", code="QUEST_NOT_COMPLETED")
    await session.commit()
