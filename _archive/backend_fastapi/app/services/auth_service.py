"""
Authentication service — user upsert and refresh token management.

All database mutations happen through the async session passed in by
the caller (typically a FastAPI dependency).
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.models.models import User


async def upsert_user(
    db: AsyncSession,
    *,
    email: str,
    name: str,
    avatar_url: str | None,
    provider: str,
    provider_id: str,
) -> User:
    """Find an existing user by OAuth provider+ID or create a new one.

    If the user already exists, their ``name`` and ``avatar_url`` are
    updated to reflect the latest data from the OAuth provider.

    Args:
        db: Async database session.
        email: User's email address from the OAuth provider.
        name: Display name from the OAuth provider.
        avatar_url: Profile picture URL.
        provider: OAuth provider identifier (``'google'`` or ``'github'``).
        provider_id: Unique user ID assigned by the OAuth provider.

    Returns:
        The upserted ``User`` ORM instance (attached to the session).
    """
    stmt = select(User).where(
        User.provider == provider,
        User.provider_id == provider_id,
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            provider=provider,
            provider_id=provider_id,
        )
        db.add(user)
        await db.flush()  # populate user.id without committing
    else:
        # Update mutable profile fields that may change on the provider side
        if name and user.name != name:
            user.name = name
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
        # Sync email if it changed (rare but possible)
        if email and user.email != email:
            user.email = email

    return user


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    """Fetch a user by primary key.

    Args:
        db: Async database session.
        user_id: The user's UUID.

    Returns:
        The ``User`` instance or ``None`` if not found.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def store_refresh_token(
    db: AsyncSession,
    user: User,
    refresh_token: str,
) -> None:
    """Hash and persist a refresh token on the user record.

    The raw token is bcrypt-hashed before storage so that a database
    compromise does not directly expose active sessions.

    Args:
        db: Async database session.
        user: The user whose refresh token should be updated.
        refresh_token: The plain-text refresh token to hash and store.
    """
    user.refresh_token_hash = hash_token(refresh_token)
    await db.flush()
