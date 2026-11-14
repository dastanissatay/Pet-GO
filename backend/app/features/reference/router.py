from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import Pagination
from app.core.reference_data import get_reference_data
from app.core.schemas import Page
from app.core.types import Species
from app.features.reference import service
from app.features.reference.schemas import BreedRead, SamplesRead

router = APIRouter(tags=["reference"])


@router.get(
    "/samples",
    summary="Sample pet, vet estimate and receipt for the demo buttons",
    response_model=SamplesRead,
)
async def read_samples() -> SamplesRead:
    return service.get_samples(get_reference_data())


@router.get("/breeds", summary="Search breed names for the quiz", response_model=Page[BreedRead])
async def list_breeds(
    species: Species,
    page: Pagination,
    q: Annotated[str | None, Query(max_length=60)] = None,
) -> Page[BreedRead]:
    names, total = service.search_breeds(get_reference_data(), species, q, page.limit, page.offset)
    return Page[BreedRead](
        items=[BreedRead(name=name, species=species) for name in names], total=total
    )
