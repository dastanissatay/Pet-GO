import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.types import Species
from app.features.expenses.schemas import Amount

LifeStage = Literal["young", "adult", "senior"]


class ShopLink(BaseModel):
    store: str
    url: str


class SourceRead(BaseModel):
    label: str
    url: str


class FoodPlanRead(BaseModel):
    """What kind of food fits the pet and what it usually costs a year. Not a diet plan."""

    species: Species
    life_stage: LifeStage
    # e.g. "Large breed senior dry dog food"; also the store search phrase.
    food_type: str
    annual_low: int
    # Middle weight, calories, food density and price; not the middle of the range.
    annual_typical: int
    annual_high: int
    daily_kcal_low: int
    daily_kcal_high: int
    pounds_per_year_low: int
    pounds_per_year_high: int
    # e.g. "Golden Retriever, 55-75 lb"
    weight_basis: str
    basis: str
    sources: list[SourceRead]
    tip: str
    shop_links: list[ShopLink]


class FoodPurchaseCreate(BaseModel):
    """A bag bought. With an amount, it is also saved as a food expense."""

    model_config = ConfigDict(extra="forbid")

    bought_on: date
    lasts_days: int = Field(ge=1, le=365)
    amount: Amount | None = None


class FoodPurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bought_on: date
    lasts_days: int
    expense_id: uuid.UUID | None


FoodStatus = Literal["none", "ok", "soon", "out"]


class FoodStatusRead(BaseModel):
    """When the current bag runs out and when to buy the next one."""

    status: FoodStatus
    last_bought_on: date | None
    lasts_days: int | None
    runs_out_on: date | None
    buy_by: date | None
    days_left: int | None
    buy_ahead_days: int
    food_type: str
    shop_links: list[ShopLink]
