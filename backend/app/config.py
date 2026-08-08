"""
config.py
- Defines application settings using `BaseSettings`.
- Loads configuration from defaults and environment variables.
- Exposes a shared `settings` instance for app-wide access.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "AI Scheduling Backend"
    APP_VERSION: str = "1.0.0"

    SECRET_KEY: str = "supersecretkey"

    DATABASE_URL: str = "sqlite:///./app.db"

    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5:1.5b"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()
