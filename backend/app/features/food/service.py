import json
import uuid
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Literal, cast
from urllib.parse import quote_plus

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import UnprocessableError
from app.core.reference_data import DATA_DIR, ReferenceDataError
from app.core.types import Species
from app.features.expenses import repository as expenses_repository
from app.features.expenses.models import Expense
from app.features.food import repository
from app.features.food.models import FoodPurchase
from app.features.food.schemas import (
    FoodPlanRead,
    FoodPurchaseCreate,
    FoodStatus,
    FoodStatusRead,
    LifeStage,
    ShopLink,
    SourceRead,
)
from app.features.pets import service as pets_service
from app.features.pets.models import Pet
from app.features.quests.service import check_local_date
from app.features.users.models import User

# Order this many days before the bag runs out, so a delivery arrives in time.
BUY_AHEAD_DAYS = 5
# Pet-food labels: most brands sell "7+" senior dog formulas; cat food uses 11+.
SENIOR_FROM_YEARS: dict[str, int] = {"dog": 7, "cat": 11}


Range = tuple[float, float]
SizeName = Literal["small", "medium", "large"]


class _Source(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_label: str = Field(min_length=1)
    source_url: HttpUrl


class _PricePerLb(_Source):
    low: float = Field(gt=0)
    high: float = Field(gt=0)


class _EnergyDensity(_Source):
    low: float = Field(gt=1000, lt=6000)
    high: float = Field(gt=1000, lt=6000)


class _EnergyFactors(_Source):
    dog: dict[LifeStage, Range]
    cat: dict[LifeStage, Range]


class _DogWeights(_Source):
    by_breed: dict[str, Range]
    by_size: dict[SizeName, Range]


class _CatWeights(_Source):
    by_breed: dict[str, Range]
    default: Range


class _FoodFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    basis: str = Field(min_length=1)
    price_per_lb: _PricePerLb
    kcal_per_kg: _EnergyDensity
    energy_factors: _EnergyFactors
    # Puppies and kittens grow through the year; this share of adult weight is the estimate.
    young_weight_share: float = Field(gt=0, le=1)
    dog_weights: _DogWeights
    cat_weights: _CatWeights


def load_food_file(data_dir: Path) -> _FoodFile:
    path = data_dir / "food.json"
    try:
        data = _FoodFile.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise ReferenceDataError(f"food.json is missing or invalid: {exc}") from exc
    stages = {"young", "adult", "senior"}
    if set(data.energy_factors.dog) != stages or set(data.energy_factors.cat) != stages:
        raise ReferenceDataError("food.json needs energy factors for young, adult and senior")
    if set(data.dog_weights.by_size) != {"small", "medium", "large"}:
        raise ReferenceDataError("food.json needs dog weights for small, medium and large")
    if (
        data.price_per_lb.low > data.price_per_lb.high
        or data.kcal_per_kg.low > data.kcal_per_kg.high
    ):
        raise ReferenceDataError("food.json has a range with low above high")
    return data


@lru_cache
def get_food_file() -> _FoodFile:
    return load_food_file(get_settings().reference_data_dir or DATA_DIR)


def life_stage(species: Species, age_years: int) -> LifeStage:
    if age_years < 1:
        return "young"
    if age_years >= SENIOR_FROM_YEARS[species]:
        return "senior"
    return "adult"


def food_type(species: Species, size_class: str | None, stage: LifeStage) -> str:
    if species == "cat":
        return {"young": "Kitten dry food", "adult": "Adult dry cat food"}.get(
            stage, "Senior dry cat food"
        )
    size = (size_class or "medium").capitalize()
    if stage == "young":
        return f"{size} breed puppy dry food"
    return f"{size} breed {stage} dry dog food"


def _tip(species: Species, stage: LifeStage, name: str) -> str:
    if stage == "young":
        return (
            f"Look for 'complete and balanced for growth' on the bag (the AAFCO statement). "
            f"{name} needs growth food until about a year old."
        )
    if stage == "senior":
        return (
            "AAFCO has no separate senior standard, so senior foods meet the adult one. "
            f"Ask your vet before switching if {name} has a health condition."
        )
    return (
        "Look for 'complete and balanced for adult maintenance' on the bag. "
        "Switch foods gradually over about a week."
    )


def shop_links(query: str) -> list[ShopLink]:
    """Store search pages for the food type, not specific products."""
    q = quote_plus(query.lower())
    return [
        ShopLink(store="Walmart", url=f"https://www.walmart.com/search?q={q}"),
        ShopLink(store="Amazon", url=f"https://www.amazon.com/s?k={q}"),
    ]


KG_PER_LB = 0.45359237


class FoodEstimate(BaseModel):
    weight_low_lb: float
    weight_high_lb: float
    weight_label: str
    weight_source_label: str
    weight_source_url: str
    daily_kcal_low: int
    daily_kcal_high: int
    pounds_per_year_low: int
    pounds_per_year_high: int
    annual_low: int
    annual_typical: int
    annual_high: int


def _weights(
    data: _FoodFile, species: Species, breed: str, size_class: str | None
) -> tuple[Range, str, _Source]:
    """Adult weight range for the breed, or the size class when the breed is not listed."""
    key = breed.strip().casefold()
    if species == "cat":
        cats = data.cat_weights
        for name, weights in cats.by_breed.items():
            if name.casefold() == key:
                return weights, f"{name}, {_lb(weights)}", cats
        return cats.default, f"typical adult cat, {_lb(cats.default)}", cats
    dogs = data.dog_weights
    for name, weights in dogs.by_breed.items():
        if name.casefold() == key:
            return weights, f"{name}, {_lb(weights)}", dogs
    size: SizeName = next((name for name in dogs.by_size if name == size_class), "medium")
    weights = dogs.by_size[size]
    return weights, f"{size} dog, {_lb(weights)}", dogs


def _lb(weights: Range) -> str:
    low, high = weights
    return f"{low:g} lb" if low == high else f"{low:g}-{high:g} lb"


def estimate_food(
    data: _FoodFile, species: Species, breed: str, size_class: str | None, stage: LifeStage
) -> FoodEstimate:
    """Calories from body weight (RER x life-stage factor), then pounds and dollars a year.

    Low end: lighter weight, lower factor, energy-dense food, low price per pound.
    High end: heavier weight, higher factor, less dense food, high price per pound.
    Typical: the middle of each of those, so it is not pulled up by stacked extremes.
    """
    (w_low, w_high), label, source = _weights(data, species, breed, size_class)
    share = data.young_weight_share if stage == "young" else 1.0
    f_low, f_high = getattr(data.energy_factors, species)[stage]

    def kcal(weight_lb: float, factor: float) -> float:
        # float ** float is typed Any (it could be complex); the base is always positive.
        return 70 * float((weight_lb * share * KG_PER_LB) ** 0.75) * factor

    kcal_low, kcal_high = kcal(w_low, f_low), kcal(w_high, f_high)
    lb_low = kcal_low * 365 / (data.kcal_per_kg.high * KG_PER_LB)
    lb_high = kcal_high * 365 / (data.kcal_per_kg.low * KG_PER_LB)
    kcal_mid = kcal((w_low + w_high) / 2, (f_low + f_high) / 2)
    density_mid = (data.kcal_per_kg.low + data.kcal_per_kg.high) / 2
    lb_mid = kcal_mid * 365 / (density_mid * KG_PER_LB)
    price_mid = (data.price_per_lb.low + data.price_per_lb.high) / 2
    return FoodEstimate(
        weight_low_lb=w_low,
        weight_high_lb=w_high,
        weight_label=label
        + (" (about half that on average in the first year)" if share < 1 else ""),
        weight_source_label=source.source_label,
        weight_source_url=str(source.source_url),
        daily_kcal_low=round(kcal_low),
        daily_kcal_high=round(kcal_high),
        pounds_per_year_low=round(lb_low),
        pounds_per_year_high=round(lb_high),
        annual_low=round(lb_low * data.price_per_lb.low),
        annual_typical=round(lb_mid * price_mid),
        annual_high=round(lb_high * data.price_per_lb.high),
    )


def _food_type_for(pet: Pet) -> str:
    species = cast(Species, pet.species)
    size = pet.size_class if species == "dog" else None
    return food_type(species, size, life_stage(species, pet.age_years))


def food_status(days_left: int) -> FoodStatus:
    if days_left <= 0:
        return "out"
    if days_left <= BUY_AHEAD_DAYS:
        return "soon"
    return "ok"


async def add_purchase(
    session: AsyncSession,
    user: User,
    pet_id: uuid.UUID,
    data: FoodPurchaseCreate,
    today_utc: date,
) -> FoodPurchase:
    """Saves the bag and, when a price is given, a matching food expense in one transaction."""
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    # One day of slack: the user's local date can be ahead of UTC.
    if data.bought_on > today_utc + timedelta(days=1):
        raise UnprocessableError(
            "Some fields are invalid.",
            code="VALIDATION_ERROR",
            details={
                "fields": [{"field": "bought_on", "message": "The date can't be in the future."}]
            },
        )
    expense_id: uuid.UUID | None = None
    if data.amount is not None:
        expense = await expenses_repository.add(
            session,
            Expense(
                pet_id=pet.id,
                spent_on=data.bought_on,
                amount=data.amount,
                category="food",
                note=_food_type_for(pet),
            ),
        )
        expense_id = expense.id
    purchase = await repository.add(
        session,
        FoodPurchase(
            pet_id=pet.id,
            bought_on=data.bought_on,
            lasts_days=data.lasts_days,
            expense_id=expense_id,
        ),
    )
    await session.commit()
    return purchase


async def get_food_status(
    session: AsyncSession, user: User, pet_id: uuid.UUID, local_date: date, today_utc: date
) -> FoodStatusRead:
    check_local_date(local_date, today_utc)
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    kind = _food_type_for(pet)
    latest = await repository.latest_for_pet(session, pet.id)
    if latest is None:
        return FoodStatusRead(
            status="none",
            last_bought_on=None,
            lasts_days=None,
            runs_out_on=None,
            buy_by=None,
            days_left=None,
            buy_ahead_days=BUY_AHEAD_DAYS,
            food_type=kind,
            shop_links=shop_links(kind),
        )
    runs_out_on = latest.bought_on + timedelta(days=latest.lasts_days)
    days_left = (runs_out_on - local_date).days
    return FoodStatusRead(
        status=food_status(days_left),
        last_bought_on=latest.bought_on,
        lasts_days=latest.lasts_days,
        runs_out_on=runs_out_on,
        buy_by=runs_out_on - timedelta(days=BUY_AHEAD_DAYS),
        days_left=days_left,
        buy_ahead_days=BUY_AHEAD_DAYS,
        food_type=kind,
        shop_links=shop_links(kind),
    )


async def get_food_plan(session: AsyncSession, user: User, pet_id: uuid.UUID) -> FoodPlanRead:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    species = cast(Species, pet.species)
    data = get_food_file()
    stage = life_stage(species, pet.age_years)
    kind = _food_type_for(pet)
    estimate = estimate_food(data, species, pet.breed, pet.size_class, stage)
    return FoodPlanRead(
        species=species,
        life_stage=stage,
        food_type=kind,
        annual_low=estimate.annual_low,
        annual_typical=estimate.annual_typical,
        annual_high=estimate.annual_high,
        daily_kcal_low=estimate.daily_kcal_low,
        daily_kcal_high=estimate.daily_kcal_high,
        pounds_per_year_low=estimate.pounds_per_year_low,
        pounds_per_year_high=estimate.pounds_per_year_high,
        weight_basis=estimate.weight_label,
        basis=data.basis,
        sources=[
            SourceRead(label=estimate.weight_source_label, url=estimate.weight_source_url),
            SourceRead(
                label=data.energy_factors.source_label, url=str(data.energy_factors.source_url)
            ),
            SourceRead(label=data.kcal_per_kg.source_label, url=str(data.kcal_per_kg.source_url)),
            SourceRead(label=data.price_per_lb.source_label, url=str(data.price_per_lb.source_url)),
        ],
        tip=_tip(species, stage, pet.name),
        shop_links=shop_links(kind),
    )
