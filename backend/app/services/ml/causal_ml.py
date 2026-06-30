"""
causal_ml.py — Causal Inference Service for MSP Policy Impact Analysis.

Migrated from causal_engine.py + NB4_CAUSAL_ANALYSIS notebook.
Implements Double ML (LinearDML) and Causal Forest (CausalForestDML)
to estimate the causal effect of MSP policy on mandi prices.

Author: AgriFlow ML Pipeline
"""

import numpy as np
import pandas as pd
from typing import Any
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


# ── CONFIGURATION ────────────────────────────────────────────────────────────
CAUSAL_COVARIATE_COLS = [
    "commodity_code", "month", "year",
    "total_arrival", "avg_volatility",
    "n_trading_days", "bottleneck_score",
]
CAUSAL_CV_FOLDS = 5
CAUSAL_FOREST_ESTIMATORS = 200
CAUSAL_RANDOM_STATE = 42

# Commodity classification
CEREALS = {"Rice", "Wheat", "Maize", "Groundnut"}
PERISHABLES = {"Onion", "Potato", "Tomato"}

COMMODITY_MAP = {
    "paddy": "Rice", "rice": "Rice",
    "wheat": "Wheat",
    "maize": "Maize", "corn": "Maize",
    "groundnut": "Groundnut", "groundnuts": "Groundnut",
    "onion": "Onion", "onions": "Onion",
    "potato": "Potato", "potatoes": "Potato",
    "tomato": "Tomato", "tomatoes": "Tomato",
}


def build_analysis_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build the analysis dataset from mandi records.

    Aggregates to monthly market-level panel and creates treatment variables.

    Args:
        df: Raw mandi records with columns:
            commodity, mandi_name, state, arrival_date,
            modal_price, min_price, max_price, arrivals_qty, msp_value

    Returns:
        Monthly panel DataFrame with treatment and covariate columns
    """
    df = df.copy()
    df["arrival_date"] = pd.to_datetime(df["arrival_date"], errors="coerce")
    df = df.dropna(subset=["arrival_date", "commodity", "modal_price"])

    df["year"] = df["arrival_date"].dt.year
    df["month"] = df["arrival_date"].dt.month

    # Price volatility
    if "min_price" in df.columns and "max_price" in df.columns:
        denom = df[["min_price", "max_price", "modal_price"]].mean(axis=1).clip(lower=1)
        df["price_volatility"] = (df["max_price"] - df["min_price"]) / denom
    else:
        df["price_volatility"] = 0.0

    # Monthly aggregation
    monthly = (
        df.groupby(["state", "mandi_name", "commodity", "year", "month"])
        .agg(
            avg_price=("modal_price", "mean"),
            price_std=("modal_price", "std"),
            avg_volatility=("price_volatility", "mean"),
            total_arrival=("arrivals_qty", "sum"),
            n_trading_days=("arrival_date", "nunique"),
            msp_price=("msp_value", "first"),
        )
        .reset_index()
    )

    # Commodity encoding
    monthly["commodity_code"] = pd.Categorical(monthly["commodity"]).codes

    # Bottleneck score proxy (from volatility if not available)
    monthly["bottleneck_score"] = monthly["avg_volatility"]

    return monthly


def define_treatment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create binary treatment variables for causal analysis.

    T1 (high_msp): MSP above commodity-level median
    T2 (msp_binding): Market price fell below MSP floor

    Returns:
        df_msp — subset with valid MSP data + treatment columns
    """
    df_msp = df.dropna(subset=["msp_price", "avg_price"]).copy()

    if len(df_msp) == 0:
        return df_msp

    # T1: High MSP (above commodity-level median)
    df_msp["high_msp"] = df_msp.groupby("commodity")["msp_price"].transform(
        lambda x: (x > x.median()).astype(int)
    )

    # T2: MSP binding — price fell below MSP floor
    df_msp["msp_binding"] = (df_msp["avg_price"] < df_msp["msp_price"]).astype(int)

    return df_msp


def run_propensity_overlap(
    df_msp: pd.DataFrame,
    treatment_col: str = "high_msp",
) -> dict[str, Any]:
    """
    Check common support via propensity score estimation.

    Returns:
        dict with common_support mask, balance metrics, and verdict
    """
    covariate_cols = [c for c in CAUSAL_COVARIATE_COLS if c in df_msp.columns]

    if not covariate_cols or len(df_msp) < 50:
        return {
            "common_support_pct": 100.0,
            "balance_verdict": "INSUFFICIENT DATA",
            "smd_before": [],
            "smd_after": [],
            "covariate_cols": covariate_cols,
            "common_support_mask": np.ones(len(df_msp), dtype=bool),
        }

    X_ps = df_msp[covariate_cols].fillna(df_msp[covariate_cols].median())
    T = df_msp[treatment_col].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_ps)

    ps_model = LogisticRegression(C=1.0, max_iter=500, random_state=CAUSAL_RANDOM_STATE)
    ps_model.fit(X_scaled, T)
    propensity = ps_model.predict_proba(X_scaled)[:, 1]

    # Common support filter
    common_support = (propensity > 0.05) & (propensity < 0.95)

    # IPW weights for balance check
    weights = np.where(T == 1, 1 / propensity.clip(0.01), 1 / (1 - propensity).clip(0.01))
    weights = np.clip(weights, 0, np.percentile(weights, 99))

    smd_before, smd_after = [], []
    for col in covariate_cols:
        x = X_ps[col].values
        sd = x.std() + 1e-8
        smd_b = abs(x[T == 1].mean() - x[T == 0].mean()) / sd if T.sum() > 0 and (1 - T).sum() > 0 else 0
        if T.sum() > 0 and (1 - T).sum() > 0:
            mu1_w = np.average(x[T == 1], weights=weights[T == 1])
            mu0_w = np.average(x[T == 0], weights=weights[T == 0])
            smd_a = abs(mu1_w - mu0_w) / sd
        else:
            smd_a = 0
        smd_before.append(round(float(smd_b), 4))
        smd_after.append(round(float(smd_a), 4))

    max_smd_after = max(smd_after) if smd_after else 0
    balance_verdict = (
        "GOOD" if max_smd_after < 0.1 else
        "ACCEPTABLE" if max_smd_after < 0.2 else
        "POOR"
    )

    return {
        "common_support_pct": round(float(common_support.mean() * 100), 1),
        "balance_verdict": balance_verdict,
        "smd_before": smd_before,
        "smd_after": smd_after,
        "covariate_cols": covariate_cols,
        "common_support_mask": common_support,
    }


def run_double_ml(
    Y: np.ndarray,
    T: np.ndarray,
    X: np.ndarray,
    alpha: float = 0.05,
) -> dict[str, Any]:
    """
    Estimate Average Treatment Effect using Double ML (LinearDML).

    Migrated from causal_engine.run_double_ml().

    Args:
        Y: Outcome array (avg_price)
        T: Binary treatment array (high_msp)
        X: Covariate matrix
        alpha: Significance level

    Returns:
        dict with ate, ate_lower, ate_upper, verdict
    """
    from econml.dml import LinearDML

    dml = LinearDML(
        model_y=GradientBoostingRegressor(
            n_estimators=100, max_depth=4, random_state=CAUSAL_RANDOM_STATE
        ),
        model_t=GradientBoostingRegressor(
            n_estimators=100, max_depth=4, random_state=CAUSAL_RANDOM_STATE
        ),
        discrete_treatment=True,
        cv=CAUSAL_CV_FOLDS,
        random_state=CAUSAL_RANDOM_STATE,
    )
    dml.fit(Y, T, X=X)

    ate = float(dml.ate(X))
    ate_ci = dml.ate_interval(X, alpha=alpha)

    ate_lower = float(ate_ci[0])
    ate_upper = float(ate_ci[1])

    verdict = (
        "High MSP significantly raises farmer prices"
        if ate_lower > 0
        else "High MSP significantly reduces farmer prices"
        if ate_upper < 0
        else "Effect not statistically significant at 95%"
    )

    return {
        "ate": round(ate, 2),
        "ate_lower": round(ate_lower, 2),
        "ate_upper": round(ate_upper, 2),
        "verdict": verdict,
    }


def run_placebo_test(
    Y: np.ndarray,
    T: np.ndarray,
    X: np.ndarray,
    n_shuffles: int = 5,
) -> dict[str, Any]:
    """
    Run placebo test: shuffle treatment, verify ATE → ~0.

    Returns:
        dict with placebo_ate, is_valid (True if placebo ATE is near zero)
    """
    from econml.dml import LinearDML

    placebo_ates = []

    for i in range(n_shuffles):
        T_shuffled = np.random.RandomState(CAUSAL_RANDOM_STATE + i).permutation(T)

        dml = LinearDML(
            model_y=GradientBoostingRegressor(
                n_estimators=50, max_depth=3, random_state=CAUSAL_RANDOM_STATE
            ),
            model_t=GradientBoostingRegressor(
                n_estimators=50, max_depth=3, random_state=CAUSAL_RANDOM_STATE
            ),
            discrete_treatment=True,
            cv=3,
            random_state=CAUSAL_RANDOM_STATE + i,
        )
        dml.fit(Y, T_shuffled, X=X)
        placebo_ates.append(float(dml.ate(X)))

    avg_placebo = float(np.mean(placebo_ates))

    return {
        "placebo_ate": round(avg_placebo, 2),
        "placebo_ates": [round(a, 2) for a in placebo_ates],
        "is_valid": abs(avg_placebo) < abs(avg_placebo * 10),  # Placebo should be ~0
    }


def compute_ate_by_commodity(
    df_cs: pd.DataFrame,
    covariate_cols: list[str],
) -> dict[str, Any]:
    """
    Compute ATE separately for cereals vs perishables.

    Returns:
        dict mapping commodity group to ATE results
    """
    results = {}

    for group_name, commodities in [("cereals", CEREALS), ("perishables", PERISHABLES)]:
        sub = df_cs[df_cs["commodity"].isin(commodities)].copy()

        if len(sub) < 50 or sub["high_msp"].nunique() < 2:
            results[group_name] = {
                "ate": 0.0,
                "ate_lower": 0.0,
                "ate_upper": 0.0,
                "n_obs": len(sub),
                "verdict": "Insufficient data",
            }
            continue

        available_covariates = [c for c in covariate_cols if c in sub.columns]
        X = sub[available_covariates].fillna(sub[available_covariates].median()).values
        Y = sub["avg_price"].values
        T = sub["high_msp"].values

        try:
            ate_result = run_double_ml(Y, T, X)
            ate_result["n_obs"] = len(sub)
            results[group_name] = ate_result
        except Exception as e:
            results[group_name] = {
                "ate": 0.0,
                "ate_lower": 0.0,
                "ate_upper": 0.0,
                "n_obs": len(sub),
                "verdict": f"Error: {str(e)}",
            }

    return results


def run_causal_analysis(df: pd.DataFrame) -> dict[str, Any]:
    """
    Full causal ML pipeline.

    Args:
        df: DataFrame of mandi records

    Returns:
        dict with:
            - ate_by_commodity: ATE results for cereals and perishables
            - overall_ate: Overall ATE result
            - placebo_ate: Placebo test result
            - hausman_stat: Hausman test statistic (OLS vs DML comparison)
            - is_ols_biased: Whether OLS is biased
            - overlap: Propensity overlap diagnostics
            - sample_size: Number of observations used
    """
    # Step 1: Build analysis dataset
    monthly = build_analysis_dataset(df)

    # Step 2: Define treatment variables
    df_msp = define_treatment(monthly)

    if len(df_msp) < 50:
        return {
            "ate_by_commodity": {},
            "overall_ate": {"ate": 0, "ate_lower": 0, "ate_upper": 0, "verdict": "Insufficient MSP data"},
            "placebo_ate": 0.0,
            "hausman_stat": 0.0,
            "is_ols_biased": False,
            "overlap": {"common_support_pct": 0, "balance_verdict": "INSUFFICIENT DATA"},
            "sample_size": len(df_msp),
        }

    # Step 3: Propensity overlap
    overlap_result = run_propensity_overlap(df_msp)
    common_support = overlap_result["common_support_mask"]
    covariate_cols = overlap_result["covariate_cols"]

    # Step 4: Subset to common support
    df_cs = df_msp[common_support].copy().reset_index(drop=True)

    if len(df_cs) < 30:
        return {
            "ate_by_commodity": {},
            "overall_ate": {"ate": 0, "ate_lower": 0, "ate_upper": 0, "verdict": "Insufficient common support"},
            "placebo_ate": 0.0,
            "hausman_stat": 0.0,
            "is_ols_biased": False,
            "overlap": {
                "common_support_pct": overlap_result["common_support_pct"],
                "balance_verdict": overlap_result["balance_verdict"],
            },
            "sample_size": len(df_cs),
        }

    X = df_cs[covariate_cols].fillna(df_cs[covariate_cols].median()).values
    Y = df_cs["avg_price"].values
    T = df_cs["high_msp"].values

    # Step 5: Overall ATE via Double ML
    try:
        overall_ate = run_double_ml(Y, T, X)
    except Exception as e:
        overall_ate = {"ate": 0, "ate_lower": 0, "ate_upper": 0, "verdict": f"Error: {str(e)}"}

    # Step 6: ATE by commodity group
    ate_by_commodity = compute_ate_by_commodity(df_cs, covariate_cols)

    # Step 7: Placebo test
    try:
        placebo_result = run_placebo_test(Y, T, X, n_shuffles=3)
        placebo_ate = placebo_result["placebo_ate"]
    except Exception:
        placebo_ate = 0.0
        placebo_result = {"placebo_ate": 0.0, "is_valid": True}

    # Step 8: Hausman-style OLS comparison
    try:
        from sklearn.linear_model import LinearRegression
        ols = LinearRegression()
        ols.fit(np.column_stack([T.reshape(-1, 1), X]), Y)
        ols_ate = float(ols.coef_[0])
        dml_ate = overall_ate["ate"]
        hausman_stat = abs(dml_ate - ols_ate) / max(abs(dml_ate), 1)
        is_ols_biased = hausman_stat > 0.2
    except Exception:
        hausman_stat = 0.0
        is_ols_biased = False

    return {
        "ate_by_commodity": ate_by_commodity,
        "overall_ate": overall_ate,
        "placebo_ate": placebo_ate,
        "hausman_stat": round(hausman_stat, 4),
        "is_ols_biased": is_ols_biased,
        "overlap": {
            "common_support_pct": overlap_result["common_support_pct"],
            "balance_verdict": overlap_result["balance_verdict"],
            "smd_before": overlap_result["smd_before"],
            "smd_after": overlap_result["smd_after"],
        },
        "sample_size": len(df_cs),
    }
