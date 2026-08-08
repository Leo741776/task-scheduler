from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import settings
from app.utils.jwt import ALGORITHM, create_access_token, decode_access_token


def test_login_returns_token_response_shape(client, register_user):
    register_user("alice")
    response = client.post(
        "/auth/login",
        json={"username": "alice", "password": "password123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) >= {"access_token", "token_type", "user"}
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    assert body["user"]["username"] == "alice"
    assert decode_access_token(body["access_token"]) == body["user"]["id"]


def test_login_wrong_password_returns_401(client, register_user):
    register_user("alice")
    response = client.post(
        "/auth/login",
        json={"username": "alice", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_unknown_user_returns_404(client):
    response = client.post(
        "/auth/login",
        json={"username": "nobody", "password": "password123"},
    )
    assert response.status_code == 404


def test_protected_route_without_authorization_returns_401(client):
    response = client.get("/activities")
    assert response.status_code == 401
    assert response.headers.get("www-authenticate") == "Bearer"


def test_protected_route_with_garbage_token_returns_401(client, auth_header):
    response = client.get("/activities", headers=auth_header("not-a-real-token"))
    assert response.status_code == 401


def test_protected_route_with_wrong_scheme_returns_401(client):
    response = client.get(
        "/activities", headers={"Authorization": "Basic abcdef"}
    )
    assert response.status_code == 401


def test_protected_route_with_malformed_authorization_returns_401(client):
    response = client.get(
        "/activities", headers={"Authorization": "Bearer"}
    )
    assert response.status_code == 401


def test_protected_route_with_token_for_deleted_user_returns_401(
    client, auth_header, register_user
):
    user = register_user("alice")
    fake_token = create_access_token(user["id"] + 9999)
    response = client.get("/activities", headers=auth_header(fake_token))
    assert response.status_code == 401


def test_protected_route_with_expired_token_returns_401(client, auth_header):
    expired = jwt.encode(
        {
            "sub": "1",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=5),
        },
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    response = client.get("/activities", headers=auth_header(expired))
    assert response.status_code == 401


def test_protected_route_with_valid_token_returns_empty_list(
    client, auth_header, login_token
):
    _user, token = login_token("alice")
    response = client.get("/activities", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json() == []
