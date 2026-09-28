import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
DEFAULT_DB_PATH = (ROOT_DIR / "medisentinel.db").as_posix()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(ROOT_DIR / ".env"), str(BASE_DIR / ".env")],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "MediSentinel — Agentic AI for Hospital Inventory"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Dataset Configuration
    MIMIC_DATA_DIR: str = str(ROOT_DIR / "datasets" / "mimic-iv-clinical-database-demo-2.2" / "hosp")

    # Database
    DEFAULT_DB_PATH: str = DEFAULT_DB_PATH
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    
    # AI / LLM Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # Server & CORS
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Governance & Autonomy Thresholds
    HIGH_RISK_PO_THRESHOLD: float = 10000.0
    HIGH_RISK_TRANSFER_QUANTITY: int = 100
    CRITICAL_STOCKOUT_DAYS_THRESHOLD: float = 3.0
    WARNING_STOCKOUT_DAYS_THRESHOLD: float = 7.0
    EXPIRY_WARNING_DAYS: int = 90

settings = Settings()
