"""
Pydantic v2 schemas for the what-if simulation engine.
"""

from typing import Any, Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    """Request schema for running a what-if simulation."""

    dataset_id: Optional[UUID] = Field(
        None, description="Dataset to base the simulation on (optional)"
    )
    cold_chain_pct: float = Field(
        ..., ge=0, le=100, description="Cold chain coverage percentage (0-100)"
    )
    season: Literal["kharif", "rabi", "zaid"] = Field(
        ..., description="Agricultural season for the simulation"
    )
    commodity: str = Field(
        ..., min_length=1, max_length=100, description="Commodity to simulate"
    )
    truck_increase_pct: float = Field(
        ..., ge=0, le=50, description="Percentage increase in truck availability (0-50)"
    )


class SimulationResult(BaseModel):
    """Result schema returned after a simulation run."""

    id: UUID
    spoilage_pct: float = Field(..., description="Spoilage after intervention (%)")
    baseline_spoilage_pct: float = Field(0, description="Spoilage without intervention (%)")
    spoilage_reduction_pct: float = Field(0, description="Reduction in spoilage (%)")
    value_at_risk: float = Field(..., description="Value at risk after intervention (₹)")
    value_saved: float = Field(0, description="Value saved by intervention (₹)")
    intervention_cost: float = Field(..., description="Total intervention cost (₹)")
    roi: float = Field(..., description="Return on investment (%)")
    breakdown: Dict[str, Any] = Field(default_factory=dict, description="Cost breakdown details")
    params: Dict[str, Any] = Field(..., description="Input parameters echoed back")
