"""
What-if simulation router.

Runs lightweight simulations synchronously (no Celery needed) and
persists results for later retrieval. Uses the ML simulation service.
"""

from typing import List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.models import Dataset, MandiRecord, Simulation, User
from app.schemas.simulate import SimulationRequest, SimulationResult
from app.services.ml.simulation import compute_simulation

router = APIRouter(prefix="/simulate", tags=["Simulation"])


async def _load_commodity_data(
    db: AsyncSession, dataset_id: UUID, commodity: str
) -> pd.DataFrame | None:
    """Load mandi records for a specific commodity from the dataset."""
    stmt = (
        select(MandiRecord)
        .where(
            MandiRecord.dataset_id == dataset_id,
            MandiRecord.commodity == commodity,
        )
        .limit(50_000)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    if not rows:
        return None

    return pd.DataFrame([
        {
            "modal_price": float(r.modal_price) if r.modal_price else None,
            "arrivals_qty": float(r.arrivals_qty) if r.arrivals_qty else None,
        }
        for r in rows
    ])


@router.post(
    "/",
    response_model=SimulationResult,
    status_code=status.HTTP_201_CREATED,
    summary="Run a what-if simulation",
)
async def run_simulation(
    body: SimulationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationResult:
    """Execute a what-if simulation and persist the results.

    The simulation runs synchronously as it is computationally
    lightweight (no ML inference). If a dataset_id is provided,
    real commodity data is used for price/volume calculations.
    """
    commodity_data = None

    # If dataset_id provided, verify ownership and load data
    if body.dataset_id:
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

        commodity_data = await _load_commodity_data(
            db, body.dataset_id, body.commodity
        )

    # Run simulation using the ML service module
    sim_result = compute_simulation(
        cold_chain_pct=body.cold_chain_pct,
        season=body.season,
        commodity=body.commodity,
        truck_increase_pct=body.truck_increase_pct,
        commodity_data=commodity_data,
    )

    # Persist
    simulation = Simulation(
        user_id=current_user.id,
        dataset_id=body.dataset_id,
        params=body.model_dump(mode="json"),
        result=sim_result,
    )
    db.add(simulation)
    await db.flush()

    return SimulationResult(
        id=simulation.id,
        spoilage_pct=sim_result["spoilage_pct"],
        baseline_spoilage_pct=sim_result["baseline_spoilage_pct"],
        spoilage_reduction_pct=sim_result["spoilage_reduction_pct"],
        value_at_risk=sim_result["value_at_risk"],
        value_saved=sim_result["value_saved"],
        intervention_cost=sim_result["intervention_cost"],
        roi=sim_result["roi"],
        breakdown=sim_result.get("breakdown", {}),
        params=body.model_dump(mode="json"),
    )


@router.get(
    "/",
    response_model=List[SimulationResult],
    summary="List simulations for the current user",
)
async def list_simulations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SimulationResult]:
    """Return all simulations belonging to the authenticated user."""
    stmt = (
        select(Simulation)
        .where(Simulation.user_id == current_user.id)
        .order_by(Simulation.created_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    simulations = result.scalars().all()
    return [
        SimulationResult(
            id=s.id,
            spoilage_pct=s.result.get("spoilage_pct", 0),
            baseline_spoilage_pct=s.result.get("baseline_spoilage_pct", 0),
            spoilage_reduction_pct=s.result.get("spoilage_reduction_pct", 0),
            value_at_risk=s.result.get("value_at_risk", 0),
            value_saved=s.result.get("value_saved", 0),
            intervention_cost=s.result.get("intervention_cost", 0),
            roi=s.result.get("roi", 0),
            breakdown=s.result.get("breakdown", {}),
            params=s.params,
        )
        for s in simulations
    ]
