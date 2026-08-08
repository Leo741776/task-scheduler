"""
__init__.py
- Marks `app.routes` as a package.
- Imports route modules so they can be accessed at the package level.
- Re-exports route modules through `__all__` for consistent imports.
"""

from . import auth
from . import activities
from . import schedules
from . import assistant

__all__ = ["auth", "activities", "schedules", "assistant"]
