from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./4season.db"

    SECRET_KEY: str = "insecure-dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    ALGORITHM: str = "HS256"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # Local/uvicorn default. On read-only-filesystem hosts (Vercel
    # serverless, etc.) main.py catches the resulting OSError at startup
    # and repoints this to /tmp/uploads automatically -- no platform
    # detection needed here.
    UPLOAD_DIR: str = "uploads"

    CANCELLATION_WINDOW_MINUTES: int = 10
    DELIVERY_FEE: float = 25

    ADMIN_EMAIL: str = "owner@4season.com"
    ADMIN_PASSWORD: str = "Admin@12345"


settings = Settings()
