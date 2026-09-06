"""
Reports router — Generate and retrieve LLM-powered intelligence reports.

Auto-generates commodity briefings from completed analysis jobs.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.models import AnalysisJob, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


class ReportResponse(BaseModel):
    """Schema for a generated report."""
    title: str
    content: str
    job_type: str
    commodity: Optional[str] = None
    generated_at: str


class ReportGenerateRequest(BaseModel):
    """Request to generate a report from an analysis job."""
    job_id: UUID


@router.post(
    "/generate",
    response_model=ReportResponse,
    summary="Generate an intelligence report from an analysis job",
)
async def generate_report(
    body: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    """Generate an LLM-powered intelligence briefing from a completed analysis.

    Takes a completed analysis job ID and uses Gemini to generate a
    professional commodity intelligence report.

    Raises:
        HTTPException: 404 if job not found, 400 if job not complete.
    """
    stmt = select(AnalysisJob).where(
        AnalysisJob.id == body.job_id,
        AnalysisJob.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found",
        )

    if job.status != "complete" or not job.result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis job is not complete or has no results",
        )

    from app.services.agent.report_generator import generate_report as gen_report

    # Extract commodity from the result if available
    commodity = None
    if isinstance(job.result, dict):
        commodity = job.result.get("commodity")

    report = await gen_report(
        analysis_results=job.result,
        job_type=job.job_type,
        commodity=commodity,
    )

    return ReportResponse(**report)


@router.get(
    "/",
    response_model=List[Dict[str, Any]],
    summary="List available reports (completed analyses)",
)
async def list_reportable_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """List completed analysis jobs that can generate reports."""
    stmt = (
        select(AnalysisJob)
        .where(
            AnalysisJob.user_id == current_user.id,
            AnalysisJob.status == "complete",
            AnalysisJob.result.isnot(None),
        )
        .order_by(AnalysisJob.completed_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    return [
        {
            "job_id": str(j.id),
            "job_type": j.job_type,
            "status": j.status,
            "created_at": str(j.created_at),
            "completed_at": str(j.completed_at),
            "has_embedding": bool(j.result and j.result.get("_summary")),
        }
        for j in jobs
    ]
