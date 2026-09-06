"""
AgriFlow application configuration.

All settings are loaded from environment variables with fallback to .env file.
Uses pydantic-settings for validation and type coercion.
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings sourced from environment variables.

    Attributes:
        DATABASE_URL: Async PostgreSQL connection string (asyncpg driver).
        DATABASE_URL_SYNC: Synchronous PostgreSQL connection string for Celery workers.
        REDIS_URL: Redis connection string used by Celery broker and result backend.
        JWT_SECRET_KEY: Secret key for signing JWTs — must be changed in production.
        JWT_ALGORITHM: Algorithm used for JWT signing. Default: HS256.
        ACCESS_TOKEN_EXPIRE_MINUTES: Access token TTL in minutes.
        REFRESH_TOKEN_EXPIRE_DAYS: Refresh token TTL in days.
        GOOGLE_CLIENT_ID: OAuth client ID for Google sign-in.
        GOOGLE_CLIENT_SECRET: OAuth client secret for Google sign-in.
        GOOGLE_REDIRECT_URI: Redirect URI registered with Google.
        GITHUB_CLIENT_ID: OAuth client ID for GitHub sign-in.
        GITHUB_CLIENT_SECRET: OAuth client secret for GitHub sign-in.
        GITHUB_REDIRECT_URI: Redirect URI registered with GitHub.
        FRONTEND_URL: Frontend origin URL for CORS and post-auth redirects.
        UPLOAD_DIR: Local directory for temporary file uploads.
        COMMODITIES: Supported agricultural commodities.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Database ────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://agriflow:agriflow@db:5432/agriflow"
    DATABASE_URL_SYNC: str = "postgresql://agriflow:agriflow@db:5432/agriflow"

    # ── Redis / Celery ──────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"

    # ── JWT ──────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Google OAuth ────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    # ── GitHub OAuth ────────────────────────────────────────────────────
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/auth/github/callback"

    # ── Frontend ────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Storage ─────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    STORAGE_BUCKET: str = "agriflow-datasets"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # ── Gemini AI (Agent + Embeddings) ──────────────────────────────────
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    AGENT_MAX_TOOL_CALLS: int = 8
    AGENT_TEMPERATURE: float = 0.1

    # ── Environment flag ────────────────────────────────────────────────
    ENVIRONMENT: str = Field(default="development", description="development | staging | production")

    @property
    def is_production(self) -> bool:
        """Return True when running in production."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        """Cookies should only be sent over HTTPS in production."""
        return self.is_production

    # ── Supported commodities ───────────────────────────────────────────
    COMMODITIES: List[str] = [
        "Groundnut",
        "Maize",
        "Onion",
        "Potato",
        "Rice",
        "Tomato",
        "Wheat",
    ]

    # ── XGBoost hyperparameters ─────────────────────────────────────────
    XGB_N_ESTIMATORS: int = 300
    XGB_MAX_DEPTH: int = 6
    XGB_LEARNING_RATE: float = 0.05
    XGB_SUBSAMPLE: float = 0.8
    XGB_COLSAMPLE_BYTREE: float = 0.8
    XGB_MIN_CHILD_WEIGHT: int = 5
    XGB_REG_ALPHA: float = 0.1
    XGB_REG_LAMBDA: float = 1.0
    XGB_EARLY_STOPPING_ROUNDS: int = 20
    XGB_TEST_SIZE: float = 0.2

    @property
    def xgb_params(self) -> dict:
        """Return XGBoost parameter dict for model training."""
        return {
            "n_estimators": self.XGB_N_ESTIMATORS,
            "max_depth": self.XGB_MAX_DEPTH,
            "learning_rate": self.XGB_LEARNING_RATE,
            "subsample": self.XGB_SUBSAMPLE,
            "colsample_bytree": self.XGB_COLSAMPLE_BYTREE,
            "min_child_weight": self.XGB_MIN_CHILD_WEIGHT,
            "reg_alpha": self.XGB_REG_ALPHA,
            "reg_lambda": self.XGB_REG_LAMBDA,
            "early_stopping_rounds": self.XGB_EARLY_STOPPING_ROUNDS,
            "objective": "reg:squarederror",
            "random_state": 42,
        }

    # ── Causal analysis configuration ──────────────────────────────────
    CAUSAL_MIN_SAMPLES: int = 100
    CAUSAL_CONFIDENCE_LEVEL: float = 0.95
    CAUSAL_TREATMENT_FEATURES: List[str] = [
        "arrivals_qty",
        "msp_value",
    ]
    CAUSAL_OUTCOME_VARIABLE: str = "modal_price"

    # ── Bottleneck score weights ────────────────────────────────────────
    BOTTLENECK_WEIGHT_DELAY: float = 0.4
    BOTTLENECK_WEIGHT_FREQUENCY: float = 0.3
    BOTTLENECK_WEIGHT_IMPACT: float = 0.3
    BOTTLENECK_HIGH_RISK_THRESHOLD: float = 0.7

    @property
    def bottleneck_weights(self) -> dict:
        """Return bottleneck scoring weights as a dictionary."""
        return {
            "delay": self.BOTTLENECK_WEIGHT_DELAY,
            "frequency": self.BOTTLENECK_WEIGHT_FREQUENCY,
            "impact": self.BOTTLENECK_WEIGHT_IMPACT,
        }


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings instance.

    The ``lru_cache`` decorator ensures the .env file is only parsed once
    per process lifetime, keeping config access effectively free.
    """
    return Settings()
