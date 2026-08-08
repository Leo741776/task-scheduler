"""
user.py
- Defines Pydantic schemas for user registration, login, and API responses.
- Validates input fields and login identity requirements.
- Shapes backend responses for user-related endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator

class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    email: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        import re
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Invalid email format')
        if '.local' in v.lower():
            raise ValueError('Email domain .local is not allowed. Please use a valid email domain.')
        return v
    

class UserLogin(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=128)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def require_username_or_email(self):
        if not self.username and not self.email:
            raise ValueError("Either username or email must be provided")
        return self

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        import re
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Invalid email format')
        if '.local' in v.lower():
            raise ValueError('Email domain .local is not allowed. Please use a valid email domain.')
        return v

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
