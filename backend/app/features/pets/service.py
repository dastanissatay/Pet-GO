import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, UnprocessableError
from app.features.pets import repository
from app.features.pets.models import Pet
from app.features.pets.schemas import PetCreate, PetUpdate
from app.features.users.models import User

# Fields that may not be cleared with an explicit null in a PATCH.
_REQUIRED_FIELDS = ("name", "species", "breed", "age_years", "zip", "insured", "worry")


def _pet_not_found() -> NotFoundError:
    return NotFoundError("We could not find that pet.", code="PET_NOT_FOUND")


def _field_error(field: str, message: str) -> UnprocessableError:
    return UnprocessableError(
        "Some fields are invalid.",
        code="VALIDATION_ERROR",
        details={"fields": [{"field": field, "message": message}]},
    )


async def create_pet(session: AsyncSession, user: User, data: PetCreate) -> Pet:
    pet = await repository.add(
        session,
        Pet(user_id=user.id, created_at=datetime.now(UTC), **data.model_dump()),
    )
    await session.commit()
    return pet


async def get_current_pet(session: AsyncSession, user: User) -> Pet:
    """The user's most recent pet. The UI shows one pet; the schema allows more."""
    pet = await repository.get_latest_for_user(session, user.id)
    if pet is None:
        raise _pet_not_found()
    return pet


async def get_owned_pet(session: AsyncSession, user: User, pet_id: uuid.UUID) -> Pet:
    # Someone else's pet is reported as not found, so ids cannot be probed.
    pet = await repository.get_for_user(session, pet_id, user.id)
    if pet is None:
        raise _pet_not_found()
    return pet


async def update_pet(session: AsyncSession, user: User, pet_id: uuid.UUID, data: PetUpdate) -> Pet:
    pet = await get_owned_pet(session, user, pet_id)
    changes = data.model_dump(exclude_unset=True)

    for field in _REQUIRED_FIELDS:
        if field in changes and changes[field] is None:
            raise _field_error(field, "This field cannot be empty.")

    species = changes.get("species", pet.species)
    size_class = changes.get("size_class", pet.size_class)
    if species == "cat":
        changes["size_class"] = None
    elif size_class is None:
        raise _field_error("size_class", "Pick a size for your dog.")

    for field, value in changes.items():
        setattr(pet, field, value)
    await session.commit()
    return pet
