"""
activity.py
- Defines the `Activity` SQLAlchemy model.
- Configures table metadata and validation constraints.
- Declares activity fields and the relationship to `User`.
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, CheckConstraint, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class Activity(Base):
    __tablename__ = "activities"

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_activities_duration_positive"),
        CheckConstraint("priority >= 1 AND priority <= 5", name="ck_activities_priority_range"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    priority = Column(Integer, default=1, nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    user = relationship("User", back_populates ="activities", lazy="selectin")
    task_group_id = Column(String(255), nullable=True, index=True)
