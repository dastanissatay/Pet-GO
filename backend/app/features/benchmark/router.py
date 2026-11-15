import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.features.benchmark import service
from app.features.benchmark.schemas import BenchmarkRead

router = APIRouter(prefix="/pets", tags=["benchmark"])


@router.get(
    "/{pet_id}/benchmark",
    summary="The pet's vet-care forecast next to the average US owner's vet spending",
    response_model=BenchmarkRead,
)
async def read_benchmark(pet_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BenchmarkRead:
    return await service.get_benchmark(db, user, pet_id)
