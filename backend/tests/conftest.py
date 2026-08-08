"""
conftest.py
- Shared pytest fixtures for backend tests.
- Spins up an isolated in-memory SQLite database per test.
- Overrides the get_db dependency on the FastAPI app.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Importing the package registers every model on Base.metadata.
from app import models  # noqa: F401
from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(
        bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
    )

    yield TestingSession

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def client(db_session):
    TestingSession = db_session

    def _override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _register_payload(username: str, suffix: str = "") -> dict:
    return {
        "first_name": "Test",
        "last_name": "User",
        "username": username,
        "password": "password123",
        "email": f"{username}{suffix}@example.com",
    }


@pytest.fixture
def register_user(client):
    """Register a user and return the parsed JSON response body."""

    def _register(username: str = "alice", **overrides) -> dict:
        payload = _register_payload(username)
        payload.update(overrides)
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _register


@pytest.fixture
def login_token(client, register_user):
    """Register and log in; return (user_dict, access_token)."""

    def _login(username: str = "alice") -> tuple[dict, str]:
        register_user(username)
        response = client.post(
            "/auth/login",
            json={"username": username, "password": "password123"},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        return body["user"], body["access_token"]

    return _login


@pytest.fixture
def auth_header():
    """Build an Authorization header for a bearer token."""

    def _build(token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    return _build
