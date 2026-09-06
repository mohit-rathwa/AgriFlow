"""
Database session dependency for FastAPI route handlers.

Provides an async context-managed session that automatically commits
on success and rolls back on exception.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session with automatic commit/rollback.

    Usage::

        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...

    The session commits when the request handler returns successfully.
    On any unhandled exception the transaction is rolled back before
    the error propagates to the exception handler middleware.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
