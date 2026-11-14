import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.features.pets import service
from app.features.pets.schemas import PetCreate, PetRead, PetUpdate

router = APIRouter(prefix="/pets", tags=["pets"])


@router.post(
    "",
    summary="Create a pet from the quiz",
    response_model=PetRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_pet(body: PetCreate, user: CurrentUser, db: DbSession) -> PetRead:
    pet = await service.create_pet(db, user, body)
    return PetRead.model_validate(pet)


@router.get(
    "/current",
    summary="The device's current pet (404 PET_NOT_FOUND if none)",
    response_model=PetRead,
)
async def read_current_pet(user: CurrentUser, db: DbSession) -> PetRead:
    pet = await service.get_current_pet(db, user)
    return PetRead.model_validate(pet)


@router.patch("/{pet_id}", summary="Update a pet", response_model=PetRead)
async def update_pet(
    pet_id: uuid.UUID, body: PetUpdate, user: CurrentUser, db: DbSession
) -> PetRead:
    pet = await service.update_pet(db, user, pet_id, body)
    return PetRead.model_validate(pet)
