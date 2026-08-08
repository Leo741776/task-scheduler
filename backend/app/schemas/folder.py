"""
folder.py
- Defines Pydantic schemas for folder create, update, and response payloads.
- Validates folder name and color length.
- Configures response serialization from ORM objects.
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

FolderColor = Literal["sky", "green", "lime", "rose", "mocha", "indigo", "teal", "magenta", "pink", "slate"]


class FolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Work"])
    color: Optional[FolderColor] = Field(None, examples=["sky"])

    model_config = ConfigDict(extra="forbid")


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    color: Optional[FolderColor] = None

    model_config = ConfigDict(extra="forbid")


class FolderResponse(FolderBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
