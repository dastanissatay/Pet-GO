from pydantic import BaseModel

from app.core.types import Species
from app.features.pets.schemas import PetCreate


class SamplesRead(BaseModel):
    """Sample input for the demo buttons. The frontend posts it to the real API."""

    pet: PetCreate
    estimate_text: str
    receipt_text: str


class BreedRead(BaseModel):
    name: str
    species: Species
