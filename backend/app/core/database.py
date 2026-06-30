"""
AgriFlow database engine and session factories.

Provides both async (for FastAPI handlers) and sync (for Celery workers)
database access using SQLAlchemy 2.0 patterns.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Auto-fix Render's postgres:// URLs to be compatible with asyncpg
async_db_url = settings.DATABASE_URL
if async_db_url.startswith("postgres://"):
    async_db_url = async_db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif async_db_url.startswith("postgresql://"):
    async_db_url = async_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

sync_db_url = settings.DATABASE_URL_SYNC
if sync_db_url.startswith("postgres://"):
    sync_db_url = sync_db_url.replace("postgres://", "postgresql://", 1)

# ── Async engine & session (FastAPI) ────────────────────────────────────
async_engine = create_async_engine(
    async_db_url,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ── Sync engine & session (Celery workers) ──────────────────────────────
sync_engine = create_engine(
    sync_db_url,
    echo=False,
    future=True,
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True,
    pool_recycle=300,
)

sync_session_factory = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Declarative base class for all ORM models.

    All models should inherit from this base so that Alembic can
    auto-generate migrations by importing ``Base.metadata``.
    """

    pass
