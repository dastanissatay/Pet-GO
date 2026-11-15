from pydantic import BaseModel

from app.core.types import Money, Species


class UnexpectedCost(BaseModel):
    """A non-routine service and its typical US price range, from prices.json."""

    price_id: str
    name: str
    low: int
    high: int
    source_url: str


class InsuranceCheckRead(BaseModel):
    """Cost context for deciding about pet insurance. Information, not advice."""

    species: Species
    insured: bool
    # US average accident-and-illness premium for this species, from insurance.json.
    average_annual_premium: Money
    average_monthly_premium: Money
    premium_source_label: str
    premium_source_url: str
    # Routine care is usually not covered by accident-and-illness plans.
    routine_low: int
    routine_high: int
    unexpected_costs: list[UnexpectedCost]
