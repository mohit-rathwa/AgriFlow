"""
process_mining.py — Process Mining & Bottleneck Analysis Service.

Migrated from NB2_PROCESS_MINING notebook + data_pipeline.compute_bottleneck_scores().
Constructs event logs with 6 supply chain stages, computes per-stage delays,
and runs Pareto analysis to rank bottleneck contributions.

Author: AgriFlow ML Pipeline
"""

import numpy as np
import pandas as pd
from typing import Any


# ── SUPPLY CHAIN STAGES ─────────────────────────────────────────────────────
STAGES = [
    "harvest",
    "transport",
    "market_arrival",
    "quality_check",
    "auction",
    "dispatch",
]

# Average delay distribution (hours) derived from NB2 analysis of mandi data
# These are baseline ratios; actual delays are computed from the data
STAGE_DELAY_RATIOS = {
    "harvest":        0.05,   # ~5% of total delay (farm-gate gathering)
    "transport":      0.30,   # ~30% (road transport to mandi)
    "market_arrival": 0.25,   # ~25% (unloading, registration, waiting)
    "quality_check":  0.10,   # ~10% (grading, moisture checks)
    "auction":        0.15,   # ~15% (bidding, price discovery)
    "dispatch":       0.15,   # ~15% (weighing, loading, paperwork)
}

# Bottleneck score weights (from existing config.py)
BOTTLENECK_W_CONGESTION = 0.4
BOTTLENECK_W_SPREAD = 0.4
BOTTLENECK_W_VOLATILITY = 0.2


def _z_score_norm(s: pd.Series) -> pd.Series:
    """Normalise a series to [0, 1] using z-score then min-max rescaling."""
    std = s.std()
    if std == 0 or len(s) == 0:
        return pd.Series(np.zeros(len(s)), index=s.index)
    z = (s - s.mean()) / std
    z_min, z_max = z.min(), z.max()
    return (z - z_min) / (z_max - z_min + 1e-8)


def compute_bottleneck_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute composite bottleneck score per market.

    Migrated from data_pipeline.compute_bottleneck_scores().
    Score = W_congestion * z(arrivals) + W_spread * z(spread) + W_vol * z(volatility)

    Args:
        df: DataFrame with columns: mandi_name, arrivals_qty, modal_price, min_price, max_price

    Returns:
        DataFrame with columns: market, score (sorted descending, normalized 0-1)
    """
    df = df.copy()

    # Price spread
    if "min_price" in df.columns and "max_price" in df.columns:
        df["price_spread"] = df["max_price"] - df["min_price"]
    else:
        df["price_spread"] = 0.0

    # Price volatility: (max - min) / mean
    if "min_price" in df.columns and "max_price" in df.columns:
        denom = df[["min_price", "max_price", "modal_price"]].mean(axis=1).clip(lower=1)
        df["price_volatility"] = (df["max_price"] - df["min_price"]) / denom
    else:
        df["price_volatility"] = 0.0

    # Market-level aggregates
    market_agg = (
        df.groupby("mandi_name")
        .agg(
            avg_arrivals=("arrivals_qty", "mean"),
            avg_spread=("price_spread", "mean"),
            avg_volatility=("price_volatility", "mean"),
        )
        .reset_index()
    )

    market_agg["z_arrivals"] = _z_score_norm(market_agg["avg_arrivals"])
    market_agg["z_spread"] = _z_score_norm(market_agg["avg_spread"])
    market_agg["z_volatility"] = _z_score_norm(market_agg["avg_volatility"])

    market_agg["score"] = (
        BOTTLENECK_W_CONGESTION * market_agg["z_arrivals"]
        + BOTTLENECK_W_SPREAD * market_agg["z_spread"]
        + BOTTLENECK_W_VOLATILITY * market_agg["z_volatility"]
    )

    # Normalize to [0, 1]
    smin, smax = market_agg["score"].min(), market_agg["score"].max()
    market_agg["score"] = (market_agg["score"] - smin) / (smax - smin + 1e-8)

    return (
        market_agg[["mandi_name", "score"]]
        .rename(columns={"mandi_name": "market"})
        .sort_values("score", ascending=False)
        .reset_index(drop=True)
    )


def build_event_log(df: pd.DataFrame) -> pd.DataFrame:
    """
    Construct an event log from mandi records.

    Each commodity-market-date combination forms a 'case' that flows through
    6 supply chain stages. Delays are estimated from arrival patterns,
    price spreads, and congestion indicators.

    Args:
        df: DataFrame with columns: commodity, mandi_name, state, arrival_date,
            modal_price, min_price, max_price, arrivals_qty

    Returns:
        DataFrame with columns: case_id, stage, event_timestamp, delay_hours, is_high_risk
    """
    df = df.copy()
    df["arrival_date"] = pd.to_datetime(df["arrival_date"], errors="coerce")
    df = df.dropna(subset=["arrival_date", "commodity", "mandi_name"])

    # Price volatility for delay estimation
    if "min_price" in df.columns and "max_price" in df.columns:
        denom = df[["min_price", "max_price", "modal_price"]].mean(axis=1).clip(lower=1)
        df["price_volatility"] = (df["max_price"] - df["min_price"]) / denom
    else:
        df["price_volatility"] = 0.1  # default

    # Arrival congestion indicator
    daily_market_count = (
        df.groupby(["commodity", "arrival_date"])["mandi_name"]
        .transform("nunique")
    )
    df["congestion"] = daily_market_count / daily_market_count.max().clip(lower=1)

    events = []

    # Group by case (commodity-market-date)
    for (commodity, market, date), group in df.groupby(
        ["commodity", "mandi_name", "arrival_date"]
    ):
        case_id = f"{commodity}_{market}_{date.strftime('%Y%m%d')}"
        avg_volatility = float(group["price_volatility"].mean())
        avg_congestion = float(group["congestion"].mean())
        avg_arrivals = float(group["arrivals_qty"].mean()) if "arrivals_qty" in group.columns else 100.0

        # Base total delay (hours) — proportional to volatility and congestion
        base_delay = 24 + (avg_volatility * 48) + (avg_congestion * 24)

        # Generate events for each stage
        cumulative_hours = 0
        for stage in STAGES:
            ratio = STAGE_DELAY_RATIOS[stage]

            # Adjust delay based on stage-specific factors
            stage_delay = base_delay * ratio
            if stage == "transport" and avg_arrivals > 500:
                stage_delay *= 1.3  # High volume = transport congestion
            elif stage == "market_arrival" and avg_congestion > 0.7:
                stage_delay *= 1.5  # High market congestion
            elif stage == "auction" and avg_volatility > 0.3:
                stage_delay *= 1.4  # Price uncertainty extends auction

            event_timestamp = pd.Timestamp(date) + pd.Timedelta(hours=cumulative_hours)
            is_high_risk = stage_delay > (base_delay * ratio * 1.5)

            events.append({
                "case_id": case_id,
                "stage": stage,
                "event_timestamp": event_timestamp,
                "delay_hours": round(float(stage_delay), 2),
                "is_high_risk": is_high_risk,
            })

            cumulative_hours += stage_delay

    return pd.DataFrame(events)


def compute_stage_delays(event_log: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Aggregate delays by stage from the event log.

    Returns:
        List of dicts: [{stage, avg_delay_hours, total_delay_hours, event_count, high_risk_pct}]
    """
    if event_log.empty:
        return [{"stage": s, "avg_delay_hours": 0, "total_delay_hours": 0,
                 "event_count": 0, "high_risk_pct": 0} for s in STAGES]

    stage_agg = (
        event_log.groupby("stage")
        .agg(
            avg_delay_hours=("delay_hours", "mean"),
            total_delay_hours=("delay_hours", "sum"),
            event_count=("delay_hours", "count"),
            high_risk_pct=("is_high_risk", "mean"),
        )
        .reset_index()
    )

    # Preserve stage order
    stage_order = {s: i for i, s in enumerate(STAGES)}
    stage_agg["order"] = stage_agg["stage"].map(stage_order)
    stage_agg = stage_agg.sort_values("order").drop(columns=["order"])

    return stage_agg.round(2).to_dict("records")


def compute_pareto_analysis(stage_delays: list[dict]) -> list[dict[str, Any]]:
    """
    Run Pareto analysis on stage delays.

    Ranks stages by total delay contribution and computes cumulative percentage.

    Returns:
        List of dicts: [{stage, delay_hours, pct_contribution, cumulative_pct}]
        Sorted by delay_hours descending.
    """
    if not stage_delays:
        return []

    # Sort by total delay descending
    sorted_delays = sorted(stage_delays, key=lambda x: x["total_delay_hours"], reverse=True)
    grand_total = sum(d["total_delay_hours"] for d in sorted_delays)

    if grand_total == 0:
        return []

    pareto_data = []
    cumulative = 0.0

    for d in sorted_delays:
        pct = (d["total_delay_hours"] / grand_total) * 100
        cumulative += pct
        pareto_data.append({
            "stage": d["stage"],
            "delay_hours": d["total_delay_hours"],
            "pct_contribution": round(pct, 1),
            "cumulative_pct": round(cumulative, 1),
        })

    return pareto_data


def run_process_mining(df: pd.DataFrame) -> dict[str, Any]:
    """
    Full process mining pipeline.

    Args:
        df: DataFrame of mandi records with columns:
            commodity, mandi_name, state, arrival_date,
            modal_price, min_price, max_price, arrivals_qty

    Returns:
        dict with keys:
            - stage_delays: list of per-stage delay summaries
            - pareto_data: list of Pareto analysis results
            - top_bottleneck: str (stage with highest delay)
            - pct_explained: float (cumulative % explained by top 2 stages)
            - bottleneck_scores: list of market-level bottleneck scores (top 50)
            - event_log_summary: dict with total_cases, total_events, high_risk_pct
    """
    # Step 1: Build event log
    event_log = build_event_log(df)

    # Step 2: Compute stage delays
    stage_delays = compute_stage_delays(event_log)

    # Step 3: Pareto analysis
    pareto_data = compute_pareto_analysis(stage_delays)

    # Step 4: Bottleneck scores
    bottleneck_scores_df = compute_bottleneck_scores(df)
    bottleneck_scores = bottleneck_scores_df.head(50).to_dict("records")

    # Step 5: Summary
    top_bottleneck = pareto_data[0]["stage"] if pareto_data else "unknown"
    pct_explained = pareto_data[1]["cumulative_pct"] if len(pareto_data) >= 2 else 0.0

    event_log_summary = {
        "total_cases": int(event_log["case_id"].nunique()) if not event_log.empty else 0,
        "total_events": len(event_log),
        "high_risk_pct": round(float(event_log["is_high_risk"].mean() * 100), 1) if not event_log.empty else 0,
    }

    # Convert event_log to serializable format for DB storage
    # (only store summary, not full log — it can be huge)
    return {
        "stage_delays": stage_delays,
        "pareto_data": pareto_data,
        "top_bottleneck": top_bottleneck,
        "pct_explained": pct_explained,
        "bottleneck_scores": bottleneck_scores,
        "event_log_summary": event_log_summary,
    }
