"""
AgriFlow API — main application entry point.

Configures the FastAPI application with CORS middleware, mounts all
routers under the ``/api`` prefix, and provides a health-check endpoint.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import agent, analysis, auth, datasets, reports, simulate

settings = get_settings()

# ── Logging ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler — runs setup on startup and teardown on shutdown."""
    # Startup: ensure upload directory exists
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    logger.info("Upload directory ready: %s", os.path.abspath(upload_dir))
    logger.info("AgriFlow API starting up (env=%s)", settings.ENVIRONMENT)

    yield  # Application is running

    # Shutdown
    logger.info("AgriFlow API shutting down")


# ── Application ─────────────────────────────────────────────────────────
app = FastAPI(
    title="AgriFlow API",
    description=(
        "Backend API for the AgriFlow agricultural supply-chain intelligence "
        "platform. Features an AI agent powered by LangGraph + Gemini with "
        "6 domain-specific tools, RAG over historical analyses, and "
        "automated LLM-generated commodity briefings."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS Middleware ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(datasets.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(simulate.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


# ── Health Check ────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health_check() -> dict:
    """Lightweight health-check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "service": "agriflow-api",
        "version": "1.0.0",
    }
