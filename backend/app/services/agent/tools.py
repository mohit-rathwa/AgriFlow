"""
tools.py — LangChain-compatible tools wrapping AgriFlow ML services.

Each tool can be called by the LangGraph agent to answer user questions
about agricultural supply chains. Tools operate on data already in the
database — they query MandiRecord, run ML analysis, and return structured
results.
"""

import json
import logging
from typing import Optional
from uuid import UUID

import pandas as pd
from langchain_core.tools import tool
from sqlalchemy import func, select, text

from app.core.database import sync_session_factory
from app.models.models import AnalysisJob, Dataset, MandiRecord

logger = logging.getLogger(__name__)


def _get_mandi_dataframe(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50_000,
) -> pd.DataFrame:
    """Load mandi records into a DataFrame with optional filters."""
    db = sync_session_factory()
    try:
        stmt = select(MandiRecord)
        if commodity:
            stmt = stmt.where(
                func.lower(MandiRecord.commodity) == commodity.lower()
            )
        if state:
            stmt = stmt.where(
                func.lower(MandiRecord.state) == state.lower()
            )
        stmt = stmt.limit(limit)
        result = db.execute(stmt)
        rows = result.scalars().all()

        if not rows:
            return pd.DataFrame()

        records = [
            {
                "commodity": r.commodity,
                "mandi_name": r.mandi_name,
                "state": r.state,
                "arrival_date": r.arrival_date,
                "modal_price": float(r.modal_price) if r.modal_price else None,
                "min_price": float(r.min_price) if r.min_price else None,
                "max_price": float(r.max_price) if r.max_price else None,
                "arrivals_qty": float(r.arrivals_qty) if r.arrivals_qty else None,
                "msp_value": float(r.msp_value) if r.msp_value else None,
            }
            for r in rows
        ]
        return pd.DataFrame(records)
    finally:
        db.close()


@tool
def query_mandi_data(
    commodity: str,
    state: Optional[str] = None,
    metric: str = "summary",
) -> str:
    """Query AGMARKNET mandi market data for a commodity.

    Use this to get price statistics, arrival volumes, and market data
    for specific commodities and states.

    Args:
        commodity: Name of the commodity (e.g. 'Onion', 'Tomato', 'Wheat')
        state: Optional state filter (e.g. 'Maharashtra', 'Karnataka')
        metric: One of 'summary', 'price_trend', 'top_markets', 'state_comparison'

    Returns:
        JSON string with the requested data analysis.
    """
    df = _get_mandi_dataframe(commodity=commodity, state=state)

    if df.empty:
        return json.dumps({"error": f"No data found for commodity='{commodity}'"})

    df["arrival_date"] = pd.to_datetime(df["arrival_date"], errors="coerce")

    if metric == "summary":
        summary = {
            "commodity": commodity,
            "state": state or "All India",
            "total_records": len(df),
            "date_range": {
                "from": str(df["arrival_date"].min().date()) if not df["arrival_date"].isna().all() else None,
                "to": str(df["arrival_date"].max().date()) if not df["arrival_date"].isna().all() else None,
            },
            "price_stats": {
                "mean": round(df["modal_price"].mean(), 2),
                "median": round(df["modal_price"].median(), 2),
                "min": round(df["modal_price"].min(), 2),
                "max": round(df["modal_price"].max(), 2),
                "std_dev": round(df["modal_price"].std(), 2),
            },
            "arrival_stats": {
                "mean_qty": round(df["arrivals_qty"].mean(), 2),
                "total_qty": round(df["arrivals_qty"].sum(), 2),
            },
            "unique_markets": int(df["mandi_name"].nunique()),
            "unique_states": int(df["state"].nunique()),
        }
        return json.dumps(summary, default=str)

    elif metric == "price_trend":
        df["month"] = df["arrival_date"].dt.to_period("M").astype(str)
        monthly = (
            df.groupby("month")
            .agg(avg_price=("modal_price", "mean"), total_arrivals=("arrivals_qty", "sum"))
            .reset_index()
            .round(2)
        )
        return monthly.tail(24).to_json(orient="records")

    elif metric == "top_markets":
        markets = (
            df.groupby("mandi_name")
            .agg(
                avg_price=("modal_price", "mean"),
                total_arrivals=("arrivals_qty", "sum"),
                record_count=("modal_price", "count"),
            )
            .sort_values("total_arrivals", ascending=False)
            .head(15)
            .reset_index()
            .round(2)
        )
        return markets.to_json(orient="records")

    elif metric == "state_comparison":
        states = (
            df.groupby("state")
            .agg(
                avg_price=("modal_price", "mean"),
                total_arrivals=("arrivals_qty", "sum"),
                market_count=("mandi_name", "nunique"),
            )
            .sort_values("avg_price", ascending=False)
            .reset_index()
            .round(2)
        )
        return states.to_json(orient="records")

    return json.dumps({"error": f"Unknown metric: {metric}"})


@tool
def run_process_mining_tool(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
) -> str:
    """Run process mining analysis on supply chain data.

    Identifies bottleneck stages, computes Pareto delay analysis across
    6 supply chain stages (harvest → transport → market_arrival →
    quality_check → auction → dispatch), and scores market congestion.

    Args:
        commodity: Optional commodity filter
        state: Optional state filter

    Returns:
        JSON with stage delays, Pareto analysis, top bottleneck, and market scores.
    """
    from app.services.ml.process_mining import run_process_mining

    df = _get_mandi_dataframe(commodity=commodity, state=state, limit=30_000)

    if df.empty:
        return json.dumps({"error": "No data found for the specified filters"})

    try:
        result = run_process_mining(df)
        # Trim for agent context window
        result["bottleneck_scores"] = result.get("bottleneck_scores", [])[:10]
        return json.dumps(result, default=str)
    except Exception as e:
        logger.exception("Process mining failed")
        return json.dumps({"error": str(e)})


@tool
def run_causal_analysis_tool(
    commodity: Optional[str] = None,
) -> str:
    """Run Double ML causal inference to measure MSP policy effect on prices.

    Uses econml LinearDML to estimate the Average Treatment Effect (ATE)
    of MSP (Minimum Support Price) on mandi modal prices. Includes
    placebo tests and OLS bias comparison.

    Args:
        commodity: Optional commodity filter (if None, runs on all data)

    Returns:
        JSON with overall ATE, ATE by commodity, confidence intervals,
        placebo test results, and OLS bias check.
    """
    from app.services.ml.causal_ml import run_causal_analysis

    df = _get_mandi_dataframe(commodity=commodity, limit=50_000)

    if df.empty:
        return json.dumps({"error": "No data found"})

    try:
        result = run_causal_analysis(df)
        return json.dumps(result, default=str)
    except Exception as e:
        logger.exception("Causal analysis failed")
        return json.dumps({"error": str(e)})


@tool
def run_prediction_tool(
    commodity: Optional[str] = None,
) -> str:
    """Run XGBoost price-risk prediction with SHAP explainability.

    Trains an XGBoost classifier to predict high-risk price events.
    Provides accuracy metrics, top SHAP feature importances, and a
    risk calendar showing predicted high-risk dates.

    Args:
        commodity: Optional commodity filter

    Returns:
        JSON with accuracy, ROC-AUC, SHAP values, and risk calendar.
    """
    from app.services.ml.prediction import run_prediction

    df = _get_mandi_dataframe(commodity=commodity, limit=50_000)

    if df.empty:
        return json.dumps({"error": "No data found"})

    try:
        result = run_prediction(df)
        # Trim risk calendar for context
        if "risk_calendar" in result:
            result["risk_calendar"] = result["risk_calendar"][:30]
        return json.dumps(result, default=str)
    except Exception as e:
        logger.exception("Prediction failed")
        return json.dumps({"error": str(e)})


@tool
def run_simulation_tool(
    commodity: str,
    cold_chain_pct: float = 30.0,
    season: str = "kharif",
    truck_increase_pct: float = 10.0,
) -> str:
    """Run what-if simulation for supply chain interventions.

    Models the impact of cold-chain infrastructure and transport
    capacity on spoilage, value at risk, and ROI.

    Args:
        commodity: Commodity name (e.g. 'Onion', 'Tomato')
        cold_chain_pct: Cold chain coverage increase (0-100%)
        season: Season ('kharif', 'rabi', 'zaid')
        truck_increase_pct: Additional truck capacity (0-50%)

    Returns:
        JSON with spoilage rates, value at risk, intervention cost, and ROI.
    """
    from app.services.ml.simulation import compute_simulation

    df = _get_mandi_dataframe(commodity=commodity, limit=20_000)
    commodity_data = df if not df.empty else None

    try:
        result = compute_simulation(
            cold_chain_pct=cold_chain_pct,
            season=season,
            commodity=commodity,
            truck_increase_pct=truck_increase_pct,
            commodity_data=commodity_data,
        )
        return json.dumps(result, default=str)
    except Exception as e:
        logger.exception("Simulation failed")
        return json.dumps({"error": str(e)})


@tool
def search_historical_analyses(query: str) -> str:
    """Search past analysis results using semantic similarity.

    Finds historical analysis jobs whose results are similar to the query.
    Useful for finding patterns like 'similar to 2022 tomato price shock'
    or 'past transport bottleneck analyses'.

    Args:
        query: Natural language search query

    Returns:
        JSON array of matching historical analysis summaries.
    """
    from app.services.agent.embeddings import search_similar_analyses

    try:
        results = search_similar_analyses(query, top_k=5)
        return json.dumps(results, default=str)
    except Exception as e:
        logger.exception("Semantic search failed")
        return json.dumps({"error": str(e), "results": []})


# Exported list of all agent tools
ALL_TOOLS = [
    query_mandi_data,
    run_process_mining_tool,
    run_causal_analysis_tool,
    run_prediction_tool,
    run_simulation_tool,
    search_historical_analyses,
]
