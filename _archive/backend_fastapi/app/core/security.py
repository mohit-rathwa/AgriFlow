"""
AgriFlow JWT and token hashing utilities.

All authentication tokens are JWTs signed with HS256.  Refresh tokens
are additionally hashed before persistence so that a database leak does
not compromise active sessions.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# Passlib context used exclusively for hashing refresh tokens
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: Dict[str, Any]) -> str:
    """Create a short-lived JWT access token.

    Args:
        data: Claims to embed in the token.  Must include ``sub`` (user ID).

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a long-lived JWT refresh token.

    Args:
        data: Claims to embed in the token.  Must include ``sub`` (user ID).

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_jwt(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT.

    Args:
        token: The raw JWT string.

    Returns:
        Decoded claims dictionary.

    Raises:
        HTTPException: 401 if the token is expired, malformed, or invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("sub") is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject claim",
            )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {exc}",
        ) from exc


def hash_token(token: str) -> str:
    """Hash a refresh token for secure database storage.

    Args:
        token: The plain-text refresh token.

    Returns:
        Bcrypt hash of the token.
    """
    return _pwd_context.hash(token)


def verify_token_hash(plain: str, hashed: str) -> bool:
    """Verify a plain-text token against its stored hash.

    Args:
        plain: The plain-text refresh token from the cookie.
        hashed: The bcrypt hash stored in the database.

    Returns:
        True if the token matches, False otherwise.
    """
    return _pwd_context.verify(plain, hashed)
