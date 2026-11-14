from pydantic import BaseModel

from app.core.types import Plan


class MeRead(BaseModel):
    plan: Plan
    free_decodes_left: int
