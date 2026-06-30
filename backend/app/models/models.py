"""
AgriFlow SQLAlchemy ORM models.

These models define the complete database schema for the AgriFlow platform,
covering users, datasets, mandi price records, analysis jobs, simulations,
and process-mining bottleneck events.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """Platform user authenticated via OAuth (Google or GitHub)."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    avatar_url = Column(Text)
    provider = Column(String(50), nullable=False)  # 'google' | 'github'
    provider_id = Column(String(255), nullable=False)
    role = Column(String(50), default="analyst")  # 'admin' | 'analyst'
    refresh_token_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ───────────────────────────────────────────────────
    datasets = relationship(
        "Dataset", back_populates="user", cascade="all, delete-orphan"
    )
    analysis_jobs = relationship("AnalysisJob", back_populates="user")
    simulations = relationship("Simulation", back_populates="user")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.provider})>"


class Dataset(Base):
    """An uploaded CSV/Excel dataset scoped to a single user."""

    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(255), nullable=False)
    commodity = Column(String(100))
    date_from = Column(Date)
    date_to = Column(Date)
    row_count = Column(Integer)
    status = Column(
        String(50), default="processing"
    )  # 'processing' | 'ready' | 'error'
    storage_path = Column(Text)
    quality_report = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # ── Relationships ───────────────────────────────────────────────────
    user = relationship("User", back_populates="datasets")
    mandi_records = relationship(
        "MandiRecord", back_populates="dataset", cascade="all, delete-orphan"
    )
    analysis_jobs = relationship(
        "AnalysisJob", back_populates="dataset", cascade="all, delete-orphan"
    )
    bottleneck_events = relationship(
        "BottleneckEvent", back_populates="dataset", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Dataset {self.name} ({self.status})>"


class MandiRecord(Base):
    """Individual mandi price / arrival record within a dataset."""

    __tablename__ = "mandi_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    dataset_id = Column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )
    commodity = Column(String(100))
    mandi_name = Column(String(255))
    state = Column(String(100))
    arrival_date = Column(Date)
    modal_price = Column(Numeric(10, 2))
    min_price = Column(Numeric(10, 2))
    max_price = Column(Numeric(10, 2))
    arrivals_qty = Column(Numeric(12, 2))
    msp_value = Column(Numeric(10, 2))

    # ── Relationships ───────────────────────────────────────────────────
    dataset = relationship("Dataset", back_populates="mandi_records")

    __table_args__ = (
        Index("idx_mandi_dataset", "dataset_id"),
        Index("idx_mandi_commodity", "commodity"),
    )

    def __repr__(self) -> str:
        return f"<MandiRecord {self.mandi_name} {self.arrival_date}>"


class AnalysisJob(Base):
    """An asynchronous analysis job dispatched to a Celery worker."""

    __tablename__ = "analysis_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    job_type = Column(
        String(50), nullable=False
    )  # 'process_mining' | 'causal_ml' | 'prediction'
    status = Column(
        String(50), default="queued"
    )  # 'queued' | 'running' | 'complete' | 'failed'
    celery_task_id = Column(String(255))
    result = Column(JSONB)
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # ── Relationships ───────────────────────────────────────────────────
    dataset = relationship("Dataset", back_populates="analysis_jobs")
    user = relationship("User", back_populates="analysis_jobs")

    def __repr__(self) -> str:
        return f"<AnalysisJob {self.job_type} ({self.status})>"


class Simulation(Base):
    """A what-if simulation run by a user against a dataset."""

    __tablename__ = "simulations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False)
    params = Column(JSONB, nullable=False)
    result = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # ── Relationships ───────────────────────────────────────────────────
    user = relationship("User", back_populates="simulations")
    dataset = relationship("Dataset")

    def __repr__(self) -> str:
        return f"<Simulation {self.id}>"


class BottleneckEvent(Base):
    """A process-mining bottleneck event within the supply chain."""

    __tablename__ = "bottleneck_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    dataset_id = Column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )
    case_id = Column(String(255))
    stage = Column(
        String(100)
    )  # 'harvest' | 'transport' | 'market_arrival' | 'quality_check' | 'auction' | 'dispatch'
    event_timestamp = Column(DateTime(timezone=True))
    delay_hours = Column(Numeric(8, 2))
    is_high_risk = Column(Boolean, default=False)

    # ── Relationships ───────────────────────────────────────────────────
    dataset = relationship("Dataset", back_populates="bottleneck_events")

    def __repr__(self) -> str:
        return f"<BottleneckEvent {self.stage} delay={self.delay_hours}h>"
