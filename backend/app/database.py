"""
database.py
- Configures the SQLAlchemy engine from application settings.
- Defines session management utilities for request-scoped database access.
- Exposes the declarative base used by ORM models.
"""

from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import settings

DATABASE_URL = settings.DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
    future=True,
)

# SQLite ignores foreign key constraints (including ON DELETE SET NULL / CASCADE)
# unless PRAGMA foreign_keys=ON is issued per connection.
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=Session,
    expire_on_commit=False,
)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        db.rollback()
        raise e
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
