"""
tasks.py — Celery task definitions for background ML job processing.

All ML inference runs inside these tasks, never inside HTTP request handlers.
Tasks use synchronous SQLAlchemy sessions since Celery workers are sync.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

import pandas as pd
from sqlalchemy import select, update

from app.workers.celery_app import celery_app
from app.core.database import sync_session_factory
from app.models.models import AnalysisJob, MandiRecord

logger = logging.getLogger(__name__)


def _load_dataset_records(db_session, dataset_id: str) -> pd.DataFrame:
    """Load mandi records for a dataset into a DataFrame (sync)."""
    stmt = select(MandiRecord).where(
        MandiRecord.dataset_id == UUID(dataset_id)
    )
    result = db_session.execute(stmt)
    rows = result.scalars().all()

    if not rows:
        return pd.DataFrame()

    records = []
    for r in rows:
        records.append({
            "commodity": r.commodity,
            "mandi_name": r.mandi_name,
            "state": r.state,
            "arrival_date": r.arrival_date,
            "modal_price": float(r.modal_price) if r.modal_price else None,
            "min_price": float(r.min_price) if r.min_price else None,
            "max_price": float(r.max_price) if r.max_price else None,
            "arrivals_qty": float(r.arrivals_qty) if r.arrivals_qty else None,
            "msp_value": float(r.msp_value) if r.msp_value else None,
        })

    return pd.DataFrame(records)


def _update_job_status(
    db_session,
    job_id: str,
    status: str,
    result: dict | None = None,
    error_message: str | None = None,
):
    """Update analysis job status in the database."""
    values = {"status": status}
    if status == "running":
        values["started_at"] = datetime.now(timezone.utc)
    if status in ("complete", "failed"):
        values["completed_at"] = datetime.now(timezone.utc)
    if result is not None:
        values["result"] = result
    if error_message is not None:
        values["error_message"] = error_message

    db_session.execute(
        update(AnalysisJob)
        .where(AnalysisJob.id == UUID(job_id))
        .values(**values)
    )
    db_session.commit()


@celery_app.task(bind=True, name="run_analysis", max_retries=2)
def run_analysis(self, job_id: str, dataset_id: str, job_type: str):
    """
    Main analysis task dispatcher.

    Routes to the appropriate ML service based on job_type:
    - 'process_mining' → services/ml/process_mining.py
    - 'causal_ml'      → services/ml/causal_ml.py
    - 'prediction'     → services/ml/prediction.py
    """
    db = sync_session_factory()

    try:
        # 1. Update job status to 'running'
        _update_job_status(db, job_id, "running")
        logger.info("Job %s started: type=%s, dataset=%s", job_id, job_type, dataset_id)

        # 2. Load data from DB for this dataset_id
        df = _load_dataset_records(db, dataset_id)

        if df.empty:
            _update_job_status(
                db, job_id, "failed",
                error_message="No records found for this dataset"
            )
            return {"status": "failed", "error": "No records found"}

        logger.info("Loaded %d records for dataset %s", len(df), dataset_id)

        # 3. Call the right ML service
        if job_type == "process_mining":
            from app.services.ml.process_mining import run_process_mining
            result = run_process_mining(df)

        elif job_type == "causal_ml":
            from app.services.ml.causal_ml import run_causal_analysis
            result = run_causal_analysis(df)

        elif job_type == "prediction":
            from app.services.ml.prediction import run_prediction
            result = run_prediction(df)

        else:
            _update_job_status(
                db, job_id, "failed",
                error_message=f"Unknown job type: {job_type}"
            )
            return {"status": "failed", "error": f"Unknown job type: {job_type}"}

        # 4. Store result JSON in analysis_jobs.result
        _update_job_status(db, job_id, "complete", result=result)
        logger.info("Job %s completed successfully", job_id)

        # 5. Generate embedding for RAG (non-blocking, failure is OK)
        try:
            from app.services.agent.embeddings import embed_analysis_result
            embed_analysis_result(job_id, job_type, result)
        except Exception as emb_err:
            logger.warning("Embedding generation failed for job %s: %s", job_id, emb_err)

        return {"status": "complete", "job_id": job_id}

    except Exception as exc:
        # 5. Update status to 'failed' on exception
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        logger.exception("Job %s failed: %s", job_id, error_msg)
        _update_job_status(db, job_id, "failed", error_message=error_msg)

        return {"status": "failed", "error": error_msg}

    finally:
        db.close()
