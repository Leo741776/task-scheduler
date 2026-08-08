"""
auth.py
- Provides the authenticated user dependency for protected routes.
- Reads and validates the Authorization Bearer token on each request.
- Returns the authenticated user id or raises 401 for any failure mode.
"""

from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.jwt import TokenError, decode_access_token


_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user_id(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> int:
    if not authorization:
        raise _credentials_exc

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise _credentials_exc

    token = parts[1]
    try:
        user_id = decode_access_token(token)
    except TokenError:
        raise _credentials_exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise _credentials_exc

    return user_id
