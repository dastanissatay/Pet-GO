from pydantic import BaseModel

from app.features.pets.schemas import PetCreate


class SamplesRead(BaseModel):
    """Sample input for the demo buttons. The frontend posts it to the real API."""

    pet: PetCreate
    estimate_text: str
    receipt_text: str
