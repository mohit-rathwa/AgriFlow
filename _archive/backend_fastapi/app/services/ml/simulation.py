"""
simulation.py — What-If Simulation Engine.

Parametric simulation model for supply chain interventions.
Computes spoilage reduction, value at risk, intervention cost, and ROI
based on cold-chain improvements, transport capacity, season, and commodity.

Author: AgriFlow ML Pipeline
"""

import numpy as np
import pandas as pd
from typing import Any


# ── COMMODITY-SPECIFIC PARAMETERS ────────────────────────────────────────────
# Base spoilage rates (% of total produce) — sourced from NCCD and FAO studies
COMMODITY_SPOILAGE = {
    "Onion":     {"base_spoilage": 25.0, "cold_sensitivity": 0.7, "transport_sensitivity": 0.5},
    "Tomato":    {"base_spoilage": 30.0, "cold_sensitivity": 0.9, "transport_sensitivity": 0.6},
    "Potato":    {"base_spoilage": 15.0, "cold_sensitivity": 0.8, "transport_sensitivity": 0.3},
    "Rice":      {"base_spoilage": 5.0,  "cold_sensitivity": 0.2, "transport_sensitivity": 0.4},
    "Wheat":     {"base_spoilage": 4.0,  "cold_sensitivity": 0.1, "transport_sensitivity": 0.3},
    "Maize":     {"base_spoilage": 6.0,  "cold_sensitivity": 0.2, "transport_sensitivity": 0.4},
    "Groundnut": {"base_spoilage": 8.0,  "cold_sensitivity": 0.3, "transport_sensitivity": 0.3},
    "Mustard":   {"base_spoilage": 5.0,  "cold_sensitivity": 0.2, "transport_sensitivity": 0.3},
}

# Seasonal multipliers on spoilage
SEASON_MULTIPLIERS = {
    "kharif":  1.3,   # Monsoon season — hot, humid, higher spoilage
    "rabi":    0.8,   # Winter — cooler, lower spoilage
    "zaid":    1.5,   # Summer — hottest, highest spoilage for perishables
}

# Cost parameters (INR)
COLD_CHAIN_COST_PER_PCT = 15_000_000   # ₹1.5 crore per 1% cold chain increase (national level)
TRUCK_COST_PER_PCT = 8_000_000          # ₹80 lakh per 1% truck capacity increase
AVERAGE_PRICE_PER_QUINTAL = 2500        # Fallback average price


def compute_simulation(
    cold_chain_pct: float,
    season: str,
    commodity: str,
    truck_increase_pct: float,
    commodity_data: pd.DataFrame | None = None,
) -> dict[str, Any]:
    """
    Run what-if simulation for a supply chain intervention scenario.

    Args:
        cold_chain_pct: Cold-chain infrastructure increase (0-100%)
        season: Season name ('kharif', 'rabi', 'zaid')
        commodity: Commodity name
        truck_increase_pct: Additional truck capacity (0-50%)
        commodity_data: Optional DataFrame of mandi records for this commodity
            to compute data-driven prices and volumes

    Returns:
        dict with:
            - spoilage_pct: Expected spoilage percentage after intervention
            - baseline_spoilage_pct: Spoilage without intervention
            - spoilage_reduction_pct: Reduction in spoilage
            - value_at_risk: Value of produce at risk (₹)
            - value_saved: Value saved by intervention (₹)
            - intervention_cost: Total cost of intervention (₹)
            - roi: Return on investment (%)
            - breakdown: Detailed cost breakdown
    """
    # Get commodity parameters
    params = COMMODITY_SPOILAGE.get(
        commodity,
        {"base_spoilage": 10.0, "cold_sensitivity": 0.5, "transport_sensitivity": 0.4},
    )

    season_key = season.lower()
    season_mult = SEASON_MULTIPLIERS.get(season_key, 1.0)

    # Compute baseline spoilage (with seasonal adjustment)
    baseline_spoilage = params["base_spoilage"] * season_mult

    # Cold-chain effect: each % increase reduces spoilage proportionally
    # Diminishing returns modeled via logarithmic decay
    cold_chain_effect = 0.0
    if cold_chain_pct > 0:
        # Maximum possible reduction from cold chain = cold_sensitivity * baseline
        max_cold_reduction = params["cold_sensitivity"] * baseline_spoilage
        # Logarithmic diminishing returns
        cold_chain_effect = max_cold_reduction * (1 - np.exp(-cold_chain_pct / 30))

    # Transport capacity effect: reduces transit spoilage
    transport_effect = 0.0
    if truck_increase_pct > 0:
        max_transport_reduction = params["transport_sensitivity"] * baseline_spoilage
        transport_effect = max_transport_reduction * (truck_increase_pct / 50)

    # Combined spoilage after intervention
    total_reduction = cold_chain_effect + transport_effect
    # Cap at 90% of baseline (can't eliminate all spoilage)
    total_reduction = min(total_reduction, baseline_spoilage * 0.9)
    spoilage_after = baseline_spoilage - total_reduction

    # Compute financial impact using actual data if available
    if commodity_data is not None and len(commodity_data) > 0:
        avg_price = float(
            pd.to_numeric(commodity_data["modal_price"], errors="coerce").mean()
        )
        total_arrivals = float(
            pd.to_numeric(commodity_data["arrivals_qty"], errors="coerce").sum()
        )
        if np.isnan(avg_price) or avg_price <= 0:
            avg_price = AVERAGE_PRICE_PER_QUINTAL
        if np.isnan(total_arrivals) or total_arrivals <= 0:
            total_arrivals = 100_000  # 1 lakh quintals as proxy
    else:
        avg_price = AVERAGE_PRICE_PER_QUINTAL
        total_arrivals = 100_000

    # Total market value
    total_value = avg_price * total_arrivals

    # Value at risk (baseline)
    value_at_risk_baseline = total_value * (baseline_spoilage / 100)
    value_at_risk_after = total_value * (spoilage_after / 100)
    value_saved = value_at_risk_baseline - value_at_risk_after

    # Intervention cost
    cold_chain_cost = cold_chain_pct * COLD_CHAIN_COST_PER_PCT
    truck_cost = truck_increase_pct * TRUCK_COST_PER_PCT
    total_cost = cold_chain_cost + truck_cost

    # ROI
    roi = ((value_saved - total_cost) / max(total_cost, 1)) * 100 if total_cost > 0 else 0

    return {
        "spoilage_pct": round(float(spoilage_after), 2),
        "baseline_spoilage_pct": round(float(baseline_spoilage), 2),
        "spoilage_reduction_pct": round(float(total_reduction), 2),
        "value_at_risk": round(float(value_at_risk_after), 0),
        "value_saved": round(float(value_saved), 0),
        "intervention_cost": round(float(total_cost), 0),
        "roi": round(float(roi), 2),
        "breakdown": {
            "cold_chain_cost": round(float(cold_chain_cost), 0),
            "truck_cost": round(float(truck_cost), 0),
            "cold_chain_effect_pct": round(float(cold_chain_effect), 2),
            "transport_effect_pct": round(float(transport_effect), 2),
            "avg_price_per_quintal": round(float(avg_price), 2),
            "total_arrivals_quintal": round(float(total_arrivals), 0),
            "total_market_value": round(float(total_value), 0),
            "season_multiplier": season_mult,
        },
    }
