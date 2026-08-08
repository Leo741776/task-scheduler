"""
auth.py
- Defines Pydantic schemas for authentication responses.
- Wraps a signed access token with the authenticated user payload.
"""

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserResponse


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)
