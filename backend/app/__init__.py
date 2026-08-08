"""
__init__.py
- Marks `app` as a Python package.
- Imports models so ORM metadata is registered at startup.
- Re-exports core configuration and database objects for package-level access.
"""

import app.models

from .config import settings
from .database import Base, engine

__all__ = [
    "settings",
    "Base",
    "engine",
]
