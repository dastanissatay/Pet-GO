from pydantic import BaseModel, ConfigDict

from app.core.types import PaidPlan, Plan


class SubscriptionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plan: PaidPlan


class SubscriptionRead(BaseModel):
    plan: Plan
