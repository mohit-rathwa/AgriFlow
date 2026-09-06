"""
Analysis job router — trigger, status polling, and result retrieval.

Jobs are dispatched to Celery workers; this router only handles
CRUD and status polling. Endpoints match the frontend's useJob hooks:
  - POST /analysis/trigger  → create + dispatch
  - GET  /analysis/{job_id}/status → poll status
  - GET  /analysis/{job_id}/result → get result when complete
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.models import AnalysisJob, Dataset, User
from app.schemas.analysis import JobCreate, JobResult, JobStatus

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post(
    "/trigger",
    response_model=JobStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a new analysis job",
)
async def trigger_job(
    body: JobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatus:
    """Enqueue a new ML analysis job for the specified dataset.

    The job is created in ``queued`` status and dispatched to a Celery
    worker. Poll ``GET /analysis/{job_id}/status`` for progress.

    Raises:
        HTTPException: 404 if the dataset does not exist or does not
            belong to the current user.
    """
    # Verify dataset ownership
    stmt = select(Dataset).where(
        Dataset.id == body.dataset_id,
        Dataset.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    dataset = result.scalar_one_or_none()
    if dataset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )

    # Create job record
    job = AnalysisJob(
        dataset_id=body.dataset_id,
        user_id=current_user.id,
        job_type=body.job_type,
        status="queued",
    )
    db.add(job)
    await db.flush()

    # Dispatch to Celery worker
    from app.workers.tasks import run_analysis

    task = run_analysis.delay(str(job.id), str(body.dataset_id), body.job_type)
    job.celery_task_id = task.id
    await db.flush()

    return JobStatus.model_validate(job)


@router.get(
    "/{job_id}/status",
    response_model=JobStatus,
    summary="Get analysis job status",
)
async def get_job_status(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatus:
    """Return the current status of an analysis job.

    Used by the frontend for polling (every 3s) until complete/failed.

    Raises:
        HTTPException: 404 if the job does not exist.
    """
    stmt = select(AnalysisJob).where(
        AnalysisJob.id == job_id,
        AnalysisJob.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found",
        )
    return JobStatus.model_validate(job)


@router.get(
    "/{job_id}/result",
    response_model=JobResult,
    summary="Get analysis job result",
)
async def get_job_result(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobResult:
    """Return the full result for a completed analysis job.

    Raises:
        HTTPException: 404 if the job does not exist.
    """
    stmt = select(AnalysisJob).where(
        AnalysisJob.id == job_id,
        AnalysisJob.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found",
        )
    return JobResult.model_validate(job)


@router.get(
    "/",
    response_model=List[JobStatus],
    summary="List analysis jobs for the current user",
)
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[JobStatus]:
    """Return all analysis jobs belonging to the authenticated user.

    Results are ordered by creation date descending.
    """
    stmt = (
        select(AnalysisJob)
        .where(AnalysisJob.user_id == current_user.id)
        .order_by(AnalysisJob.created_at.desc())
    )
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    return [JobStatus.model_validate(j) for j in jobs]
