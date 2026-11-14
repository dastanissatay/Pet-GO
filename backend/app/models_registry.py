"""Imports every feature's models so Alembic autogenerate and the tests see all tables.

Add one import per feature here when its models.py is created.
"""

from app.core.db import Base
from app.features.estimates.models import Decode
from app.features.expenses.models import Expense
from app.features.pets.models import Pet
from app.features.quests.models import QuestCompletion
from app.features.users.models import User

__all__ = ["Base", "Decode", "Expense", "Pet", "QuestCompletion", "User"]
