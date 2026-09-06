"""
Authentication dependency for FastAPI route handlers.

Extracts the JWT from the ``access_token`` HTTP-only cookie, decodes it,
and returns the corresponding User ORM instance.
"""

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_jwt
from app.dependencies.db import get_db
from app.models.models import User
from app.services.auth_service import get_user_by_id


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the current user from the access_token cookie.

    Args:
        request: The incoming HTTP request (cookies are read from here).
        db: Async database session (injected via ``get_db``).

    Returns:
        The authenticated ``User`` ORM instance.

    Raises:
        HTTPException: 401 if the cookie is missing, the JWT is invalid,
            or the user no longer exists in the database.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — missing access_token cookie",
        )

    payload = decode_jwt(token)  # raises 401 on failure

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject claim",
        )

    try:
        user_id = UUID(user_id_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: malformed user ID",
        ) from exc

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — account may have been deleted",
        )

    return user
