"""
main.py
- Creates and configures the FastAPI application instance.
- Registers middleware and API routers for core backend features.
- Defines startup initialization and health/status endpoints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text

from app.routes import auth, activities, schedules, assistant, folders

from app.database import Base, engine

app = FastAPI(
    title="AI Scheduling App Backend",
    description="Backend API for activity management and AI-generated schedules",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = exc.errors()
    messages = []
    for error in errors:
        field = '.'.join(str(loc) for loc in error['loc'] if loc != 'body')
        messages.append(f"{field}: {error['msg']}")
    return JSONResponse(
        status_code=400,
        content={"detail": "; ".join(messages), "errors": errors}
    )

def ensure_user_columns():
    inspector = inspect(engine)
    if 'users' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('users')}
    with engine.connect() as connection:
        if 'first_name' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN first_name VARCHAR(50)'))
        if 'last_name' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN last_name VARCHAR(50)'))
        connection.commit()

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_user_columns()

app.include_router(auth.router)
app.include_router(activities.router)
app.include_router(schedules.router)
app.include_router(assistant.router)
app.include_router(folders.router)

@app.get("/")
def root():
    return {"message": "Backend is running successfully"}

@app.get("/health")
def health():
    return {"status": "ok"}
