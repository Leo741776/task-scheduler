"""
folder.py
- Defines the `Folder` SQLAlchemy model.
- Groups activities under a named, user-owned bucket.
- Enforces (user_id, name) uniqueness so a user cannot have two folders with the same name.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class Folder(Base):
    __tablename__ = "folders"

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_folders_user_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    color = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
