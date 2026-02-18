from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://tkuser:tkuser@localhost:5432/rayees_family"

    # JWT
    secret_key: str = "rayees-family-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # OpenAI
    openai_api_key: Optional[str] = None

    # App
    app_name: str = "Rayees Family"
    debug: bool = True
    upload_dir: str = "uploads"

    class Config:
        # Use absolute path to .env file
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")


settings = Settings()
