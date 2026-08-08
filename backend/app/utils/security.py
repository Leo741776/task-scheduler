"""
security.py
- Defines password hashing utilities using a configured Passlib context.
- Verifies plaintext passwords against stored hashes during authentication.
- Exposes helper checks for hash upgrade/rehash decisions.
"""

from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def password_needs_rehash(hashed_password: str) -> bool:
    return pwd_context.needs_update(hashed_password)
