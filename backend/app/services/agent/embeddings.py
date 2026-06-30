"""
embeddings.py — Embedding service for RAG over historical analyses.

Generates text embeddings using Google Gemini's text-embedding-004 model
and stores them alongside analysis results. Supports semantic similarity
search over past AnalysisJob results using pgvector.
"""

import json
import logging
from typing import Any

import google.generativeai as genai
from sqlalchemy import select, text

from app.core.config import get_settings
from app.core.database import sync_session_factory
from app.models.models import AnalysisJob

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_embedding(text_content: str) -> list[float]:
    """Generate embedding vector using Gemini embedding model.

    Args:
        text_content: Text to embed (max ~2048 tokens)

    Returns:
        List of floats representing the embedding vector (768 dimensions)
    """
    genai.configure(api_key=settings.GOOGLE_API_KEY)

    result = genai.embed_content(
        model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
        content=text_content,
        task_type="retrieval_document",
    )

    return result["embedding"]


def _summarize_analysis_result(job_type: str, result: dict) -> str:
    """Create a text summary of an analysis result for embedding.

    Converts the structured JSON result into a natural language summary
    that captures the key findings for semantic search.
    """
    parts = [f"Analysis type: {job_type}."]

    if job_type == "process_mining":
        top = result.get("top_bottleneck", "unknown")
        pct = result.get("pct_explained", 0)
        summary = result.get("event_log_summary", {})
        parts.append(
            f"Top bottleneck stage: {top}. "
            f"Top 2 stages explain {pct}% of delays. "
            f"Total cases: {summary.get('total_cases', 0)}. "
            f"High risk events: {summary.get('high_risk_pct', 0)}%."
        )
        # Add Pareto data
        pareto = result.get("pareto_data", [])
        for p in pareto[:3]:
            parts.append(
                f"Stage {p['stage']}: {p.get('pct_contribution', 0)}% of total delay."
            )

    elif job_type == "causal_ml":
        overall = result.get("overall_ate", {})
        parts.append(
            f"Overall ATE of MSP on prices: ₹{overall.get('ate', 'N/A')}. "
            f"Placebo ATE: ₹{result.get('placebo_ate', 'N/A')}. "
            f"OLS biased: {result.get('is_ols_biased', 'unknown')}."
        )
        ate_by_commodity = result.get("ate_by_commodity", {})
        for commodity, values in list(ate_by_commodity.items())[:5]:
            parts.append(
                f"ATE for {commodity}: ₹{values.get('ate', 'N/A')} "
                f"(CI: ₹{values.get('ate_lower', '?')} to ₹{values.get('ate_upper', '?')})."
            )

    elif job_type == "prediction":
        parts.append(
            f"Prediction accuracy: {result.get('accuracy', 'N/A')}. "
            f"ROC-AUC: {result.get('roc_auc', 'N/A')}. "
            f"Sample size: {result.get('sample_size', 'N/A')}."
        )
        shap_values = result.get("shap_values", [])
        if shap_values:
            top_features = [f"{s.get('feature', '?')}" for s in shap_values[:5]]
            parts.append(f"Top SHAP features: {', '.join(top_features)}.")

    return " ".join(parts)


def embed_analysis_result(job_id: str, job_type: str, result: dict) -> None:
    """Generate and store embedding for a completed analysis job.

    Called automatically when an analysis job completes (from tasks.py).
    Stores the embedding as a JSON array in the analysis_jobs.result field
    under the key '_embedding'.

    Args:
        job_id: UUID string of the analysis job
        job_type: Type of analysis ('process_mining', 'causal_ml', 'prediction')
        result: The analysis result dictionary
    """
    try:
        if not settings.GOOGLE_API_KEY:
            logger.warning("GOOGLE_API_KEY not set — skipping embedding generation")
            return

        summary = _summarize_analysis_result(job_type, result)
        embedding = _get_embedding(summary)

        # Store embedding in a separate field in the result JSON
        db = sync_session_factory()
        try:
            from uuid import UUID
            job = db.get(AnalysisJob, UUID(job_id))
            if job and job.result:
                updated_result = dict(job.result)
                updated_result["_embedding"] = embedding
                updated_result["_summary"] = summary
                job.result = updated_result
                db.commit()
                logger.info("Stored embedding for job %s (%d dimensions)", job_id, len(embedding))
        finally:
            db.close()

    except Exception as e:
        logger.exception("Failed to embed analysis result for job %s: %s", job_id, e)


def search_similar_analyses(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    """Search for historical analyses similar to the query.

    Uses cosine similarity between the query embedding and stored
    analysis embeddings.

    Args:
        query: Natural language search query
        top_k: Number of results to return

    Returns:
        List of dicts with job_id, job_type, summary, similarity_score
    """
    if not settings.GOOGLE_API_KEY:
        return [{"error": "GOOGLE_API_KEY not configured"}]

    try:
        # Get query embedding
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        query_result = genai.embed_content(
            model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
            content=query,
            task_type="retrieval_query",
        )
        query_embedding = query_result["embedding"]

        # Search across all completed analysis jobs that have embeddings
        db = sync_session_factory()
        try:
            stmt = select(AnalysisJob).where(
                AnalysisJob.status == "complete",
                AnalysisJob.result.isnot(None),
            )
            result = db.execute(stmt)
            jobs = result.scalars().all()

            # Compute cosine similarity in Python
            # (pgvector extension would be faster, but this works without it)
            import numpy as np

            scored = []
            for job in jobs:
                if not job.result or "_embedding" not in job.result:
                    continue

                stored_emb = job.result["_embedding"]
                # Cosine similarity
                a = np.array(query_embedding)
                b = np.array(stored_emb)
                similarity = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))

                scored.append({
                    "job_id": str(job.id),
                    "job_type": job.job_type,
                    "summary": job.result.get("_summary", "No summary"),
                    "similarity_score": round(similarity, 4),
                    "created_at": str(job.created_at),
                })

            # Sort by similarity descending
            scored.sort(key=lambda x: x["similarity_score"], reverse=True)
            return scored[:top_k]

        finally:
            db.close()

    except Exception as e:
        logger.exception("Semantic search failed: %s", e)
        return [{"error": str(e)}]
