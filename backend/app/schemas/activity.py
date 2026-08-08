"""
activity.py
- Defines Pydantic schemas for activity create, update, and response payloads.
- Validates incoming activity data with field constraints.
- Configures response serialization from ORM objects.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class ActivityBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["Study plant types"])
    description: Optional[str] = Field(None, examples=["Notes on plant species"])
    duration_minutes: int = Field(..., gt=0, examples=[90])
    priority: int = Field(default=1, ge=1, le=5, examples=[3])
    folder_id: Optional[int] = None
    completed: bool = False
    task_group_id: Optional[str] = Field(None, max_length=255)

    model_config = ConfigDict(extra="forbid")


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, gt=0)
    priority: Optional[int] = Field(None, ge=1, le=5)
    folder_id: Optional[int] = None
    completed: Optional[bool] = None
    task_group_id: Optional[str] = Field(None, max_length=255)

    model_config = ConfigDict(extra="forbid")


class ActivityResponse(ActivityBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
