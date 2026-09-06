"""
Authentication router — OAuth flows, session management, and user info.

Supports Google and GitHub OAuth 2.0.  JWTs are stored exclusively in
HTTP-only cookies to mitigate XSS-based token theft.
"""

import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_jwt,
    verify_token_hash,
)
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.models import User
from app.schemas.user import UserRead
from app.services.auth_service import get_user_by_id, store_refresh_token, upsert_user

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Cookie configuration ────────────────────────────────────────────────
ACCESS_TOKEN_MAX_AGE = 900  # 15 minutes
REFRESH_TOKEN_MAX_AGE = 604800  # 7 days


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set access and refresh token cookies on the response.

    Args:
        response: The outgoing HTTP response.
        access_token: Encoded JWT access token.
        refresh_token: Encoded JWT refresh token.
    """
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
        max_age=ACCESS_TOKEN_MAX_AGE,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
        max_age=REFRESH_TOKEN_MAX_AGE,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Delete both auth cookies from the browser."""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


# ═══════════════════════════════════════════════════════════════════════
# GOOGLE OAuth
# ═══════════════════════════════════════════════════════════════════════


@router.get("/google", summary="Redirect to Google OAuth consent screen")
async def google_login() -> RedirectResponse:
    """Build the Google OAuth 2.0 authorization URL and redirect the user."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback", summary="Handle Google OAuth callback")
async def google_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Exchange the authorization code for tokens, upsert user, set cookies.

    Args:
        code: Authorization code returned by Google.
        db: Async database session.

    Returns:
        Redirect to the frontend dashboard with auth cookies set.
    """
    # 1. Exchange code for tokens
    token_payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data=token_payload,
        )
        if token_resp.status_code != 200:
            logger.error("Google token exchange failed: %s", token_resp.text)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code with Google",
            )
        token_data = token_resp.json()
        google_access_token = token_data["access_token"]

        # 2. Fetch user info
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if user_resp.status_code != 200:
            logger.error("Google userinfo request failed: %s", user_resp.text)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve user info from Google",
            )
        user_data = user_resp.json()

    # 3. Upsert user
    user = await upsert_user(
        db,
        email=user_data["email"],
        name=user_data.get("name", ""),
        avatar_url=user_data.get("picture"),
        provider="google",
        provider_id=str(user_data["id"]),
    )

    # 4. Create JWT tokens
    jwt_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(jwt_data)
    refresh_token = create_refresh_token(jwt_data)

    # 5. Persist hashed refresh token
    await store_refresh_token(db, user, refresh_token)

    # 6. Set cookies and redirect
    redirect = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard",
        status_code=status.HTTP_302_FOUND,
    )
    _set_auth_cookies(redirect, access_token, refresh_token)
    return redirect


# ═══════════════════════════════════════════════════════════════════════
# GITHUB OAuth
# ═══════════════════════════════════════════════════════════════════════


@router.get("/github", summary="Redirect to GitHub OAuth consent screen")
async def github_login() -> RedirectResponse:
    """Build the GitHub OAuth authorization URL and redirect the user."""
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "user:email",
    }
    url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/github/callback", summary="Handle GitHub OAuth callback")
async def github_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Exchange the authorization code for tokens, upsert user, set cookies.

    Args:
        code: Authorization code returned by GitHub.
        db: Async database session.

    Returns:
        Redirect to the frontend dashboard with auth cookies set.
    """
    # 1. Exchange code for access token
    token_payload = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data=token_payload,
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            logger.error("GitHub token exchange failed: %s", token_resp.text)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code with GitHub",
            )
        token_data = token_resp.json()
        github_access_token = token_data.get("access_token")
        if not github_access_token:
            logger.error("GitHub token response missing access_token: %s", token_data)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub did not return an access token",
            )

        # 2. Fetch user profile
        auth_headers = {"Authorization": f"Bearer {github_access_token}"}
        user_resp = await client.get(
            "https://api.github.com/user",
            headers=auth_headers,
        )
        if user_resp.status_code != 200:
            logger.error("GitHub user request failed: %s", user_resp.text)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve user info from GitHub",
            )
        user_data = user_resp.json()

        # 3. Fetch primary email if not in user response
        email = user_data.get("email")
        if not email:
            emails_resp = await client.get(
                "https://api.github.com/user/emails",
                headers=auth_headers,
            )
            if emails_resp.status_code == 200:
                emails = emails_resp.json()
                # Prefer the primary verified email
                primary = next(
                    (e for e in emails if e.get("primary") and e.get("verified")),
                    None,
                )
                if primary:
                    email = primary["email"]
                elif emails:
                    email = emails[0]["email"]

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email from GitHub — ensure your email is public or verified",
            )

    # 4. Upsert user
    user = await upsert_user(
        db,
        email=email,
        name=user_data.get("name") or user_data.get("login", ""),
        avatar_url=user_data.get("avatar_url"),
        provider="github",
        provider_id=str(user_data["id"]),
    )

    # 5. Create JWT tokens
    jwt_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(jwt_data)
    refresh_token = create_refresh_token(jwt_data)

    # 6. Persist hashed refresh token
    await store_refresh_token(db, user, refresh_token)

    # 7. Set cookies and redirect
    redirect = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard",
        status_code=status.HTTP_302_FOUND,
    )
    _set_auth_cookies(redirect, access_token, refresh_token)
    return redirect


# ═══════════════════════════════════════════════════════════════════════
# SESSION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════


@router.get("/me", response_model=UserRead, summary="Get current user profile")
async def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    """Return the profile of the currently authenticated user.

    Requires a valid ``access_token`` cookie.
    """
    return UserRead.model_validate(current_user)


@router.post("/logout", summary="Log out and clear auth cookies")
async def logout(response: Response) -> dict:
    """Clear access and refresh token cookies, effectively logging the user out."""
    _clear_auth_cookies(response)
    return {"detail": "Successfully logged out"}


@router.post("/refresh", summary="Refresh the access token")
async def refresh_access_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Issue a new access token using the refresh token cookie.

    The refresh token is validated against both the JWT signature and
    the bcrypt hash stored in the database to prevent replay with
    revoked tokens.

    Args:
        request: Incoming HTTP request (refresh_token cookie is read).
        response: Outgoing HTTP response (new access_token cookie is set).
        db: Async database session.

    Returns:
        Success message.

    Raises:
        HTTPException: 401 if the refresh token is missing, expired,
            invalid, or does not match the stored hash.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    # Decode the JWT (raises 401 on expiry / invalid signature)
    payload = decode_jwt(refresh_token)

    # Ensure this is actually a refresh token, not an access token
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — expected refresh token",
        )

    # Look up the user
    from uuid import UUID as _UUID

    user_id = _UUID(payload["sub"])
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Verify the refresh token hash
    if not user.refresh_token_hash or not verify_token_hash(
        refresh_token, user.refresh_token_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    # Issue a fresh access token
    jwt_data = {"sub": str(user.id), "email": user.email}
    new_access_token = create_access_token(jwt_data)

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
        max_age=ACCESS_TOKEN_MAX_AGE,
    )

    return {"detail": "Access token refreshed"}
