"""
schedule.py
- Defines the `Schedule` SQLAlchemy model.
- Stores schedule metadata, time bounds, and serialized activities.
- Connects each schedule to a `User` with ORM relationship mapping.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    activities_json = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    user = relationship("User", back_populates="schedules", lazy="selectin")

    def __repr__(self):
        return f"<Schedule(id={self.id}, user_id={self.user_id}, start={self.start_time}, end={self.end_time})>"
