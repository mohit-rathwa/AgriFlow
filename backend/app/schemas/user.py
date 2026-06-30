"""
Pydantic v2 schemas for User responses.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    """Public representation of a user returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str | None = None
    avatar_url: str | None = None
    provider: str
    role: str
    created_at: datetime


class UserResponse(BaseModel):
    """Wrapper for single-user API responses."""

    user: UserRead
