import re
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationInfo,
    field_validator,
)

from app.core.types import SizeClass, Species, Worry

ZIP_RE = re.compile(r"^\d{5}$")

PetName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
Breed = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
AgeYears = Annotated[int, Field(ge=0, le=30)]


def check_zip(value: str) -> str:
    if not ZIP_RE.fullmatch(value):
        raise ValueError("Enter a 5-digit ZIP code.")
    return value


class PetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: PetName
    species: Species
    breed: Breed
    age_years: AgeYears
    # Dogs only. Ignored (stored as null) for cats.
    size_class: SizeClass | None = Field(default=None, validate_default=True)
    zip: str
    insured: bool
    worry: Worry

    @field_validator("zip")
    @classmethod
    def zip_five_digits(cls, value: str) -> str:
        return check_zip(value)

    @field_validator("size_class")
    @classmethod
    def size_matches_species(
        cls, value: SizeClass | None, info: ValidationInfo
    ) -> SizeClass | None:
        species = info.data.get("species")
        if species == "cat":
            return None
        if species == "dog" and value is None:
            raise ValueError("Pick a size for your dog.")
        return value


class PetUpdate(BaseModel):
    """All fields optional. The species/size rule is checked after merging."""

    model_config = ConfigDict(extra="forbid")

    name: PetName | None = None
    species: Species | None = None
    breed: Breed | None = None
    age_years: AgeYears | None = None
    size_class: SizeClass | None = None
    zip: str | None = None
    insured: bool | None = None
    worry: Worry | None = None

    @field_validator("zip")
    @classmethod
    def zip_five_digits(cls, value: str | None) -> str | None:
        return None if value is None else check_zip(value)


class PetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    species: Species
    breed: str
    age_years: int
    size_class: SizeClass | None
    zip: str
    insured: bool
    worry: Worry
    created_at: datetime
