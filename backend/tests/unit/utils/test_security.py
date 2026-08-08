from app.utils.security import (
    hash_password,
    password_needs_rehash,
    verify_password,
)


def test_hash_password_returns_string_distinct_from_plaintext():
    hashed = hash_password("password123")
    assert isinstance(hashed, str)
    assert hashed != "password123"
    assert len(hashed) > 20


def test_verify_password_returns_true_for_correct_password():
    hashed = hash_password("password123")
    assert verify_password("password123", hashed) is True


def test_verify_password_returns_false_for_wrong_password():
    hashed = hash_password("password123")
    assert verify_password("wrong-password", hashed) is False


def test_hash_password_produces_different_hashes_for_same_input():
    first = hash_password("password123")
    second = hash_password("password123")
    assert first != second
    assert verify_password("password123", first) is True
    assert verify_password("password123", second) is True


def test_verify_password_returns_false_for_malformed_hash():
    assert verify_password("password123", "not-a-valid-hash") is False


def test_password_needs_rehash_returns_false_for_freshly_hashed_password():
    hashed = hash_password("password123")
    assert password_needs_rehash(hashed) is False
