"""
schedule.py
- Defines Pydantic schemas for schedule payloads and API responses.
- Validates schedule metadata and scheduled item structures.
- Shapes request and response data exchanged with the frontend.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


class ScheduleItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    start_time: datetime
    end_time: datetime

    model_config = ConfigDict(extra="forbid")


class ScheduleBase(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime

    model_config = ConfigDict(extra="forbid")


class ScheduleCreate(ScheduleBase):
    schedule: List[ScheduleItem] = Field(default_factory=list)


class ScheduleUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    schedule: Optional[List[ScheduleItem]] = None

    model_config = ConfigDict(extra="forbid")


class ScheduleResponse(ScheduleBase):
    id: int
    user_id: int
    schedule: List[ScheduleItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
