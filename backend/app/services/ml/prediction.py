"""
prediction.py — XGBoost Risk Prediction + SHAP Explanation Service.

Migrated from predictive_engine.py + NB5_XGBOOST notebook.
Implements feature engineering, time-aware train/test split,
XGBoost classifier for high-bottleneck-risk prediction, and SHAP analysis.

Author: AgriFlow ML Pipeline
"""

import numpy as np
import pandas as pd
from typing import Any
from sklearn.preprocessing import LabelEncoder


# ── CONFIGURATION ────────────────────────────────────────────────────────────
COMMODITIES = ["Groundnut", "Maize", "Onion", "Potato", "Rice", "Tomato", "Wheat"]

XGB_N_ESTIMATORS = 500
XGB_MAX_DEPTH = 6
XGB_LEARNING_RATE = 0.05
XGB_SUBSAMPLE = 0.8
XGB_COLSAMPLE_BYTREE = 0.8
XGB_EARLY_STOPPING = 30
XGB_RANDOM_STATE = 42

XGB_FEATURE_COLS = [
    "commodity_code", "month", "year", "dow",
    "arrivals_qty", "price_lag1", "price_lag7", "price_lag30",
    "roll_vol_7d", "arrival_momentum", "price_dev_ma30",
    "market_count_today", "is_harvest_season", "is_lean_season",
    "state_arrivals_today", "market_bot_score",
    "msp_value", "has_msp", "price_vs_msp",
]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create all features for XGBoost risk prediction model.

    Migrated from data_pipeline.engineer_features().

    Features:
    1. Lagged prices (1, 7, 30 days)
    2. Rolling 7-day volatility (coefficient of variation)
    3. Price deviation from 30-day moving average
    4. Arrival momentum (7d / 30d ratio)
    5. Market count per commodity per day
    6. Seasonal indicators (harvest / lean)
    7. Commodity label encoding
    8. State-level total arrivals
    9. MSP features (msp_value, has_msp, price_vs_msp)
    10. Market bottleneck score proxy

    Args:
        df: DataFrame with columns: commodity, mandi_name, state, arrival_date,
            modal_price, min_price, max_price, arrivals_qty, msp_value

    Returns:
        DataFrame enriched with feature columns
    """
    df = df.copy()
    df["arrival_date"] = pd.to_datetime(df["arrival_date"], errors="coerce")
    df = df.dropna(subset=["arrival_date", "commodity", "modal_price"])

    # Ensure numeric
    for col in ["modal_price", "min_price", "max_price", "arrivals_qty", "msp_value"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["year"] = df["arrival_date"].dt.year
    df["month"] = df["arrival_date"].dt.month
    df["dow"] = df["arrival_date"].dt.dayofweek

    df = df.sort_values(["commodity", "mandi_name", "arrival_date"])
    grp = df.groupby(["commodity", "mandi_name"])

    # 1. Lagged prices
    df["price_lag1"] = grp["modal_price"].shift(1)
    df["price_lag7"] = grp["modal_price"].shift(7)
    df["price_lag30"] = grp["modal_price"].shift(30)

    # 2. Rolling 7-day volatility (coefficient of variation)
    df["roll_vol_7d"] = grp["modal_price"].transform(
        lambda x: x.rolling(7, min_periods=3).std()
        / x.rolling(7, min_periods=3).mean().clip(lower=1)
    )

    # 3. Price deviation from 30-day MA
    roll30 = grp["modal_price"].transform(
        lambda x: x.rolling(30, min_periods=7).mean()
    )
    df["price_dev_ma30"] = (df["modal_price"] - roll30) / roll30.clip(lower=1)

    # 4. Arrival momentum (7d / 30d rolling arrival mean)
    roll7_arr = grp["arrivals_qty"].transform(
        lambda x: x.rolling(7, min_periods=3).mean()
    )
    roll30_arr = grp["arrivals_qty"].transform(
        lambda x: x.rolling(30, min_periods=7).mean()
    )
    df["arrival_momentum"] = roll7_arr / (roll30_arr + 1e-8)

    # 5. Market count per commodity per day
    df["market_count_today"] = df.groupby(["commodity", "arrival_date"])[
        "mandi_name"
    ].transform("nunique")

    # 6. Seasonal indicators (Indian crop calendar)
    df["is_harvest_season"] = df["month"].isin([10, 11, 12, 4, 5]).astype(int)
    df["is_lean_season"] = df["month"].isin([7, 8, 9]).astype(int)

    # 7. Commodity label encoding (fixed order for consistency)
    le = LabelEncoder()
    le.fit(COMMODITIES)
    df["commodity_code"] = le.transform(
        df["commodity"].where(df["commodity"].isin(COMMODITIES), other="Onion")
    )

    # 8. State-level total arrivals
    if "state" in df.columns:
        df["state_arrivals_today"] = df.groupby(["state", "arrival_date"])[
            "arrivals_qty"
        ].transform("sum")
    else:
        df["state_arrivals_today"] = df["arrivals_qty"] * 5  # proxy

    # 9. MSP features
    df["has_msp"] = df["msp_value"].notna().astype(int)
    df["msp_value"] = df["msp_value"].fillna(0)
    df["price_vs_msp"] = (df["modal_price"] - df["msp_value"]) / df["msp_value"].clip(
        lower=1
    )

    # 10. Market bottleneck score proxy (from price volatility)
    if "min_price" in df.columns and "max_price" in df.columns:
        denom = df[["min_price", "max_price", "modal_price"]].mean(axis=1).clip(lower=1)
        df["market_bot_score"] = (df["max_price"] - df["min_price"]) / denom
    else:
        df["market_bot_score"] = df["roll_vol_7d"].fillna(0)

    return df


def build_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add high_bottleneck binary target column.

    Target = 1 if price_volatility > 75th-percentile for that commodity.
    Migrated from predictive_engine.build_xgboost_target().
    """
    df = df.copy()

    # Price volatility
    if "min_price" in df.columns and "max_price" in df.columns:
        denom = df[["min_price", "max_price", "modal_price"]].mean(axis=1).clip(lower=1)
        df["price_volatility"] = (df["max_price"] - df["min_price"]) / denom
    else:
        df["price_volatility"] = df["market_bot_score"].fillna(0)

    df["threshold_75"] = df.groupby("commodity")["price_volatility"].transform(
        lambda x: x.quantile(0.75)
    )
    df["high_bottleneck"] = (df["price_volatility"] > df["threshold_75"]).astype(int)

    return df


def time_aware_split(
    df_model: pd.DataFrame,
    feature_cols: list[str],
    target_col: str = "high_bottleneck",
) -> tuple:
    """
    Time-aware train/test split. NEVER random.

    Train: year <= 2023
    Test: year >= 2024
    Fallback: last 20% if < 1000 test rows.

    Returns:
        (X_train, y_train, X_test, y_test, test_df)
    """
    train_mask = df_model["year"] <= 2023
    test_mask = df_model["year"] >= 2024

    X_train = df_model.loc[train_mask, feature_cols].values
    y_train = df_model.loc[train_mask, target_col].values
    X_test = df_model.loc[test_mask, feature_cols].values
    y_test = df_model.loc[test_mask, target_col].values
    test_df = df_model[test_mask].copy()

    if len(X_test) < 1000:
        split = int(0.8 * len(df_model))
        X_train = df_model.iloc[:split][feature_cols].values
        y_train = df_model.iloc[:split][target_col].values
        X_test = df_model.iloc[split:][feature_cols].values
        y_test = df_model.iloc[split:][target_col].values
        test_df = df_model.iloc[split:].copy()

    return X_train, y_train, X_test, y_test, test_df


def train_xgboost(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: list[str] | None = None,
):
    """
    Train XGBoost classifier for bottleneck risk prediction.

    Migrated from predictive_engine.train_xgboost().
    """
    import xgboost as xgb

    scale_pos = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

    model = xgb.XGBClassifier(
        n_estimators=XGB_N_ESTIMATORS,
        max_depth=XGB_MAX_DEPTH,
        learning_rate=XGB_LEARNING_RATE,
        subsample=XGB_SUBSAMPLE,
        colsample_bytree=XGB_COLSAMPLE_BYTREE,
        scale_pos_weight=scale_pos,
        random_state=XGB_RANDOM_STATE,
        eval_metric="auc",
        early_stopping_rounds=XGB_EARLY_STOPPING,
        verbosity=0,
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    return model


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> dict[str, Any]:
    """
    Compute classification metrics.

    Migrated from predictive_engine.evaluate_xgboost().
    """
    from sklearn.metrics import (
        accuracy_score,
        f1_score,
        roc_auc_score,
        average_precision_score,
        confusion_matrix,
    )

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "f1": round(float(f1_score(y_test, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_proba)), 4),
        "avg_precision": round(float(average_precision_score(y_test, y_proba)), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "bottleneck_rate_test": round(float(y_test.mean()), 4),
    }


def get_shap_analysis(
    model,
    X: np.ndarray,
    feature_names: list[str],
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """
    Compute SHAP values for top features.

    Migrated from predictive_engine.get_shap_values().

    Returns:
        List of top_n features with their mean absolute SHAP value
    """
    import shap

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)

    # Mean absolute SHAP value per feature
    mean_abs_shap = np.abs(shap_values).mean(axis=0)

    feature_importance = []
    for i, fname in enumerate(feature_names):
        feature_importance.append({
            "feature": fname,
            "importance": round(float(mean_abs_shap[i]), 4),
        })

    # Sort by importance and take top_n
    feature_importance.sort(key=lambda x: x["importance"], reverse=True)
    return feature_importance[:top_n]


def build_risk_calendar(
    model,
    test_df: pd.DataFrame,
    feature_cols: list[str],
) -> list[dict[str, Any]]:
    """
    Build risk calendar from test predictions.

    Each entry is a date with its predicted risk level.

    Returns:
        List of {date, risk_level, risk_probability, commodity}
    """
    X_test = test_df[feature_cols].values
    y_proba = model.predict_proba(X_test)[:, 1]

    test_df = test_df.copy()
    test_df["risk_prob"] = y_proba

    # Aggregate by date
    if "arrival_date" in test_df.columns:
        daily_risk = (
            test_df.groupby("arrival_date")
            .agg(
                avg_risk=("risk_prob", "mean"),
                max_risk=("risk_prob", "max"),
                n_records=("risk_prob", "count"),
            )
            .reset_index()
        )

        calendar = []
        for _, row in daily_risk.head(365).iterrows():  # Limit to 1 year
            risk_level = (
                "high" if row["avg_risk"] > 0.6
                else "medium" if row["avg_risk"] > 0.35
                else "low"
            )
            calendar.append({
                "date": str(row["arrival_date"]),
                "risk_level": risk_level,
                "risk_probability": round(float(row["avg_risk"]), 3),
            })

        return calendar

    return []


def run_prediction(df: pd.DataFrame) -> dict[str, Any]:
    """
    Full prediction pipeline.

    Args:
        df: DataFrame of mandi records

    Returns:
        dict with:
            - accuracy: float
            - f1: float
            - roc_auc: float
            - top_features: list of {feature, importance}
            - risk_calendar: list of {date, risk_level, risk_probability}
            - shap_values: list of {feature, importance}
            - metrics: full metrics dict
            - sample_size: int
    """
    # Step 1: Engineer features
    df_feat = engineer_features(df)

    # Step 2: Add target
    df_feat = build_target(df_feat)

    # Step 3: Filter to available features
    feature_cols = [c for c in XGB_FEATURE_COLS if c in df_feat.columns]

    if not feature_cols:
        return {
            "accuracy": 0,
            "top_features": [],
            "risk_calendar": [],
            "shap_values": [],
            "metrics": {},
            "sample_size": 0,
            "error": "No feature columns available",
        }

    # Step 4: Drop NaN
    df_model = df_feat.dropna(subset=feature_cols + ["high_bottleneck"]).copy()
    df_model = df_model.sort_values("arrival_date").reset_index(drop=True)

    if len(df_model) < 200:
        return {
            "accuracy": 0,
            "top_features": [],
            "risk_calendar": [],
            "shap_values": [],
            "metrics": {},
            "sample_size": len(df_model),
            "error": "Insufficient data for training (need >= 200 rows)",
        }

    # Step 5: Time-aware split
    X_train, y_train, X_test, y_test, test_df = time_aware_split(
        df_model, feature_cols
    )

    # Step 6: Train model
    model = train_xgboost(X_train, y_train, X_test, y_test, feature_names=feature_cols)

    # Step 7: Evaluate
    metrics = evaluate_model(model, X_test, y_test)

    # Step 8: SHAP analysis
    # Use a sample for SHAP to keep it fast
    shap_sample_size = min(len(X_test), 5000)
    shap_idx = np.random.RandomState(XGB_RANDOM_STATE).choice(
        len(X_test), shap_sample_size, replace=False
    )
    shap_values = get_shap_analysis(
        model, X_test[shap_idx], feature_cols, top_n=10
    )

    # Step 9: Risk calendar
    risk_calendar = build_risk_calendar(model, test_df, feature_cols)

    return {
        "accuracy": metrics["accuracy"],
        "f1": metrics["f1"],
        "roc_auc": metrics["roc_auc"],
        "top_features": shap_values,
        "risk_calendar": risk_calendar,
        "shap_values": shap_values,
        "metrics": metrics,
        "sample_size": len(df_model),
        "train_size": len(X_train),
        "test_size": len(X_test),
    }
