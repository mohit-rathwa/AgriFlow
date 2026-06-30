"""
Pydantic v2 schemas for analysis job management.
"""

from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    """Request schema for creating a new analysis job."""

    dataset_id: UUID = Field(..., description="Dataset to run the analysis against")
    job_type: Literal["process_mining", "causal_ml", "prediction"] = Field(
        ..., description="Type of analysis to execute"
    )


class JobStatus(BaseModel):
    """Lightweight status view for analysis job polling."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_type: str
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class JobResult(BaseModel):
    """Full analysis job result returned upon completion."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_type: str
    status: str
    result: Optional[Dict[str, Any]] = None
