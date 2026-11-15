from datetime import date

from pydantic import BaseModel, ConfigDict

from app.core.types import Cadence


class TypicalCost(BaseModel):
    """The related prices.json row, unadjusted, with its source."""

    price_id: str
    name: str
    low: int
    high: int
    source_url: str


class QuestRead(BaseModel):
    id: str
    title: str
    cadence: Cadence
    xp: int
    why: str
    completed: bool
    typical_cost: TypicalCost | None


class QuestsRead(BaseModel):
    daily: list[QuestRead]
    weekly: list[QuestRead]
    monthly: list[QuestRead]


class ProgressRead(BaseModel):
    xp: int
    # Level and avatar stage are the same thing: 1 from 0 XP, 2 from 100, 3 from 300.
    level: int
    stage: int
    # Total XP needed for the next level; null at the top level.
    next_level_xp: int | None
    streak: int


class QuestCompleteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    local_date: date


class QuestCompleteResult(BaseModel):
    progress: ProgressRead
    leveled_up: bool
