"""
user.py
- Defines the `User` SQLAlchemy model for persisted account records.
- Stores identity fields, password hash, and audit timestamps.
- Declares ORM relationships to `Activity` and `Schedule`.
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    activities = relationship(
        "Activity",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )

    schedules = relationship(
        "Schedule",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}')>"
