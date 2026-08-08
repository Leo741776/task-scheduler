"""
jwt.py
- Issues and decodes signed access tokens for authentication.
- Wraps python-jose with a fixed algorithm and project-wide secret.
- Raises TokenError on any decode failure for routes to convert to 401.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


class TokenError(Exception):
    pass


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise TokenError("Invalid or expired token")

    sub = payload.get("sub")
    if sub is None:
        raise TokenError("Token missing subject")
    try:
        return int(sub)
    except (TypeError, ValueError):
        raise TokenError("Invalid subject in token")
