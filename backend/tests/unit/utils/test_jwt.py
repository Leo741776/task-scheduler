from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.config import settings
from app.utils.jwt import (
    ALGORITHM,
    TokenError,
    create_access_token,
    decode_access_token,
)


def test_create_decode_round_trip():
    token = create_access_token(42)
    assert isinstance(token, str) and len(token) > 0
    assert decode_access_token(token) == 42


def test_decode_garbage_raises_token_error():
    with pytest.raises(TokenError):
        decode_access_token("not-a-token")


def test_decode_wrong_signature_raises_token_error():
    bad_secret_token = jwt.encode(
        {
            "sub": "1",
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        },
        "wrong-secret",
        algorithm=ALGORITHM,
    )
    with pytest.raises(TokenError):
        decode_access_token(bad_secret_token)


def test_decode_expired_token_raises_token_error():
    expired = jwt.encode(
        {
            "sub": "1",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=5),
        },
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    with pytest.raises(TokenError):
        decode_access_token(expired)


def test_decode_token_missing_subject_raises_token_error():
    no_sub = jwt.encode(
        {"exp": datetime.now(timezone.utc) + timedelta(days=1)},
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    with pytest.raises(TokenError):
        decode_access_token(no_sub)


def test_decode_token_with_non_numeric_subject_raises_token_error():
    bad_sub = jwt.encode(
        {
            "sub": "not-a-number",
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        },
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    with pytest.raises(TokenError):
        decode_access_token(bad_sub)
