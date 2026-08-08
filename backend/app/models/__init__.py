"""
__init__.py
- Marks `app.models` as a package.
- Imports model classes so SQLAlchemy metadata is fully registered.
- Re-exports models through `__all__` for consistent package-level imports.
"""

from .user import User
from .activity import Activity
from .schedule import Schedule
from .folder import Folder

__all__ = [
    "User",
    "Activity",
    "Schedule",
    "Folder",
]
