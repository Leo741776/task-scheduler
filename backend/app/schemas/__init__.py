"""
__init__.py
- Marks `app.schemas` as a package.
- Imports schema classes for package-level access.
- Re-exports schema names through `__all__` for consistent imports.
"""

from .user import UserCreate, UserLogin, UserResponse
from .activity import ActivityCreate, ActivityUpdate, ActivityResponse
from .schedule import (
    ScheduleItem,
    ScheduleCreate,
    ScheduleUpdate,
    ScheduleResponse,
)

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "ActivityCreate",
    "ActivityUpdate",
    "ActivityResponse",
    "ScheduleItem",
    "ScheduleCreate",
    "ScheduleUpdate",
    "ScheduleResponse",
]
