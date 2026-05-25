from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "CampusVoice"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"

    # Databases
    DATABASE_URL: str
    SYNC_DATABASE_URL: str

    # Cache/Broker
    REDIS_URL: str

    # SMS Gateway
    ARKESEL_API_KEY: str
    ARKESEL_SENDER_ID: str = "CampusVoice"

    # Paystack
    PAYSTACK_SECRET_KEY: str
    PAYSTACK_PUBLIC_KEY: str

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Default Super Admin setup
    ADMIN_EMAIL: str = "admin@campusvoice.com"
    ADMIN_PASSWORD: str = "adminpassword123"

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()
