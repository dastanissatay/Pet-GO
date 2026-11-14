from app.core.reference_data import ReferenceData
from app.core.types import Species
from app.features.pets.schemas import PetCreate
from app.features.reference.schemas import SamplesRead


def get_samples(data: ReferenceData) -> SamplesRead:
    return SamplesRead(
        pet=PetCreate.model_validate(data.samples.pet.model_dump()),
        estimate_text=data.samples.estimate_text,
        receipt_text=data.samples.receipt_text,
    )


def search_breeds(
    data: ReferenceData, species: Species, query: str | None, limit: int, offset: int
) -> tuple[list[str], int]:
    """Case-insensitive match. Names that start with the query come first."""
    names = data.breeds.dog if species == "dog" else data.breeds.cat
    needle = (query or "").strip().casefold()
    if needle:
        matches = [name for name in names if needle in name.casefold()]
        matches.sort(key=lambda name: (not name.casefold().startswith(needle), name))
    else:
        matches = sorted(names)
    return matches[offset : offset + limit], len(matches)
