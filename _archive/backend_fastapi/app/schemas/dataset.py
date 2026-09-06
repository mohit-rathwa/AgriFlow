"""
Pydantic v2 schemas for Dataset CRUD and quality reporting.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DatasetCreate(BaseModel):
    """Schema for creating a new dataset (upload metadata)."""

    name: str = Field(..., min_length=1, max_length=255, description="Dataset display name")
    commodity: Optional[str] = Field(
        None, max_length=100, description="Primary commodity (optional — auto-detected if omitted)"
    )


class QualityReport(BaseModel):
    """Data quality report generated during dataset ingestion."""

    missing_timestamps_pct: float = Field(
        ..., ge=0, le=100, description="Percentage of rows with missing dates"
    )
    price_outliers: int = Field(..., ge=0, description="Number of price outlier rows")
    encoding_issues: int = Field(
        ..., ge=0, description="Number of encoding/character issues detected"
    )
    msp_year_encoding_bug: bool = Field(
        ..., description="Whether the MSP-year encoding bug was detected"
    )
    date_range: Dict[str, str] = Field(
        ..., description="{'from': 'YYYY-MM-DD', 'to': 'YYYY-MM-DD'}"
    )
    total_rows: int = Field(..., ge=0, description="Total rows after cleaning")
    commodities_found: List[str] = Field(
        ..., description="Distinct commodity names found in the data"
    )


class DatasetRead(BaseModel):
    """Full dataset representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    commodity: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    row_count: Optional[int] = None
    status: str
    storage_path: Optional[str] = None
    quality_report: Optional[Dict[str, Any]] = None
    created_at: datetime


class DatasetStatus(BaseModel):
    """Lightweight status view for dataset list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    commodity: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: str
    row_count: Optional[int] = None
    quality_report: Optional[Dict[str, Any]] = None
    created_at: datetime

