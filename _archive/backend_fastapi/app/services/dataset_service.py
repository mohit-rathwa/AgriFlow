"""
dataset_service.py — CSV Upload, Parsing, Quality Checks, and DB Insert.

Handles the full data ingestion pipeline:
1. Parse uploaded CSV
2. Run quality checks (encoding, missing data, outliers, MSP bugs)
3. Insert cleaned records into mandi_records table
4. Generate and store quality report as JSONB

Author: AgriFlow Backend
"""

import io
import re
import chardet
import numpy as np
import pandas as pd
from datetime import date as date_type
from typing import Any
from uuid import UUID

from sqlalchemy import insert, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Dataset, MandiRecord


# ── COMMODITY NORMALIZATION MAP ──────────────────────────────────────────────
COMMODITY_MAP = {
    "paddy": "Rice", "rice": "Rice",
    "wheat": "Wheat",
    "maize": "Maize", "corn": "Maize",
    "groundnut": "Groundnut", "groundnuts": "Groundnut",
    "onion": "Onion", "onions": "Onion",
    "potato": "Potato", "potatoes": "Potato",
    "tomato": "Tomato", "tomatoes": "Tomato",
    "mustard": "Mustard",
}


def detect_encoding(file_bytes: bytes) -> str:
    """Detect file encoding using chardet."""
    result = chardet.detect(file_bytes[:100_000])
    return result.get("encoding", "utf-8") or "utf-8"


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names via fuzzy matching."""
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    col_map = {}
    for col in df.columns:
        low = col.lower()
        if "commodity" in low:
            col_map[col] = "commodity"
        elif "state" in low:
            col_map[col] = "state"
        elif "market" in low or "mandi" in low or "center" in low:
            col_map[col] = "mandi_name"
        elif "modal" in low and "price" in low:
            col_map[col] = "modal_price"
        elif "min" in low and "price" in low:
            col_map[col] = "min_price"
        elif "max" in low and "price" in low:
            col_map[col] = "max_price"
        elif "arrival" in low and ("qty" in low or "quant" in low or "tonne" in low):
            col_map[col] = "arrivals_qty"
        elif "date" in low or "report" in low:
            col_map[col] = "arrival_date"
        elif "msp" in low:
            col_map[col] = "msp_value"

    return df.rename(columns=col_map)


def _check_encoding_issues(df: pd.DataFrame) -> list[dict[str, str]]:
    """Detect smart-quote and non-UTF8 character issues."""
    issues = []
    # Regex for common encoding artifacts
    pattern = re.compile(r'[\x80-\x9f\u2018\u2019\u201c\u201d\u2013\u2014\ufffd]')

    for col in df.select_dtypes(include=["object"]).columns:
        sample_issues = df[col].dropna().astype(str).apply(
            lambda x: bool(pattern.search(x))
        )
        if sample_issues.any():
            bad_sample = df.loc[sample_issues.idxmax(), col]
            issues.append({
                "column": col,
                "sample": str(bad_sample)[:200],
            })

    return issues


def _check_msp_year_encoding_bug(df: pd.DataFrame) -> bool:
    """
    Detect MSP year encoding bug where years are encoded as (1),(2),(3)
    instead of actual year values.
    """
    year_cols = [c for c in df.columns if "year" in c.lower()]
    for col in year_cols:
        vals = df[col].dropna().astype(str).head(20)
        if vals.str.match(r'^\(\d+\)$').any():
            return True
    return False


def _detect_price_outliers(
    df: pd.DataFrame,
    price_col: str = "modal_price",
    max_outliers: int = 20,
) -> list[dict[str, Any]]:
    """Detect price outliers using mean + 3*std per commodity."""
    outliers = []

    if price_col not in df.columns:
        return outliers

    prices = pd.to_numeric(df[price_col], errors="coerce")

    if "commodity" in df.columns:
        for commodity, group in df.groupby("commodity"):
            group_prices = pd.to_numeric(group[price_col], errors="coerce").dropna()
            if len(group_prices) < 10:
                continue
            mean_p = group_prices.mean()
            std_p = group_prices.std()
            threshold = mean_p + 3 * std_p

            for idx, val in group_prices.items():
                if val > threshold:
                    outliers.append({
                        "row": int(idx),
                        "value": round(float(val), 2),
                        "commodity": str(commodity),
                    })
                    if len(outliers) >= max_outliers:
                        return outliers
    else:
        prices = prices.dropna()
        mean_p = prices.mean()
        std_p = prices.std()
        threshold = mean_p + 3 * std_p
        for idx, val in prices.items():
            if val > threshold:
                outliers.append({
                    "row": int(idx),
                    "value": round(float(val), 2),
                    "commodity": "unknown",
                })
                if len(outliers) >= max_outliers:
                    return outliers

    return outliers


def run_quality_checks(df: pd.DataFrame) -> dict[str, Any]:
    """
    Run all data quality checks on uploaded CSV data.

    Returns quality_report dict matching the spec schema.
    """
    # Missing timestamps
    if "arrival_date" in df.columns:
        dates = pd.to_datetime(df["arrival_date"], errors="coerce")
        missing_pct = round(float(dates.isna().mean() * 100), 2)
        valid_dates = dates.dropna()
        date_range = {
            "from": str(valid_dates.min().date()) if len(valid_dates) > 0 else None,
            "to": str(valid_dates.max().date()) if len(valid_dates) > 0 else None,
        }
    else:
        missing_pct = 100.0
        date_range = {"from": None, "to": None}

    # Commodities found
    if "commodity" in df.columns:
        normalized = df["commodity"].str.strip().str.lower().map(COMMODITY_MAP)
        commodities_found = sorted(normalized.dropna().unique().tolist())
    else:
        commodities_found = []

    # Price outliers
    price_outliers = _detect_price_outliers(df)

    # Encoding issues
    encoding_issues = _check_encoding_issues(df)

    # MSP year encoding bug
    msp_year_bug = _check_msp_year_encoding_bug(df)

    return {
        "missing_timestamps_pct": missing_pct,
        "price_outliers": price_outliers,
        "encoding_issues": encoding_issues,
        "msp_year_encoding_bug": msp_year_bug,
        "date_range": date_range,
        "total_rows": len(df),
        "commodities_found": commodities_found,
    }


def parse_csv(file_bytes: bytes) -> pd.DataFrame:
    """
    Parse uploaded CSV bytes into a normalized DataFrame.

    Handles encoding detection, column normalization, and type coercion.
    """
    # Detect encoding
    encoding = detect_encoding(file_bytes)

    try:
        df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding, low_memory=False)
    except UnicodeDecodeError:
        df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1", low_memory=False)

    # Normalize columns
    df = _normalize_columns(df)

    # Parse dates
    if "arrival_date" in df.columns:
        df["arrival_date"] = pd.to_datetime(df["arrival_date"], errors="coerce")

    # Normalize commodity names
    if "commodity" in df.columns:
        df["commodity"] = df["commodity"].str.strip().str.lower().map(COMMODITY_MAP)

    # Numeric conversions
    for col in ["modal_price", "min_price", "max_price", "arrivals_qty", "msp_value"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


async def process_upload(
    db: AsyncSession,
    dataset_id: UUID,
    file_bytes: bytes,
    storage_path: str,
) -> dict[str, Any]:
    """
    Process an uploaded CSV file: parse, check quality, insert records.

    Args:
        db: Async database session
        dataset_id: UUID of the dataset record
        file_bytes: Raw CSV file bytes
        storage_path: Path where the file is stored

    Returns:
        quality_report dict
    """
    try:
        # Step 1: Parse CSV
        df = parse_csv(file_bytes)

        # Step 2: Run quality checks
        quality_report = run_quality_checks(df)

        # Step 3: Clean data for insertion
        # Filter to rows with required columns
        required = ["commodity", "arrival_date", "modal_price"]
        available_required = [c for c in required if c in df.columns]

        if len(available_required) < 2:
            # Update dataset status to error
            await db.execute(
                update(Dataset)
                .where(Dataset.id == dataset_id)
                .values(
                    status="error",
                    quality_report=quality_report,
                )
            )
            await db.commit()
            return quality_report

        df_clean = df.dropna(subset=available_required).copy()

        # Remove rows with non-positive prices
        if "modal_price" in df_clean.columns:
            df_clean = df_clean[df_clean["modal_price"] > 0]

        # Step 4: Insert mandi records in batches
        batch_size = 5000
        total_inserted = 0

        for start in range(0, len(df_clean), batch_size):
            batch = df_clean.iloc[start : start + batch_size]
            records = []

            for _, row in batch.iterrows():
                record = {
                    "dataset_id": dataset_id,
                    "commodity": row.get("commodity"),
                    "mandi_name": row.get("mandi_name"),
                    "state": row.get("state"),
                    "arrival_date": row["arrival_date"].date()
                    if pd.notna(row.get("arrival_date"))
                    else None,
                    "modal_price": float(row["modal_price"])
                    if pd.notna(row.get("modal_price"))
                    else None,
                    "min_price": float(row["min_price"])
                    if pd.notna(row.get("min_price"))
                    else None,
                    "max_price": float(row["max_price"])
                    if pd.notna(row.get("max_price"))
                    else None,
                    "arrivals_qty": float(row["arrivals_qty"])
                    if pd.notna(row.get("arrivals_qty"))
                    else None,
                    "msp_value": float(row["msp_value"])
                    if pd.notna(row.get("msp_value"))
                    else None,
                }
                records.append(record)

            if records:
                await db.execute(insert(MandiRecord), records)
                total_inserted += len(records)

        # Step 5: Update dataset metadata
        date_from = None
        date_to = None
        if "arrival_date" in df_clean.columns:
            valid_dates = df_clean["arrival_date"].dropna()
            if len(valid_dates) > 0:
                date_from = valid_dates.min().date()
                date_to = valid_dates.max().date()

        commodity_val = None
        if "commodity" in df_clean.columns:
            commodities = df_clean["commodity"].dropna().unique()
            if len(commodities) == 1:
                commodity_val = str(commodities[0])
            elif len(commodities) > 1:
                commodity_val = f"{len(commodities)} commodities"

        await db.execute(
            update(Dataset)
            .where(Dataset.id == dataset_id)
            .values(
                status="ready",
                row_count=total_inserted,
                date_from=date_from,
                date_to=date_to,
                commodity=commodity_val,
                quality_report=quality_report,
                storage_path=storage_path,
            )
        )
        await db.commit()

        return quality_report

    except Exception as e:
        # Update dataset status to error
        await db.execute(
            update(Dataset)
            .where(Dataset.id == dataset_id)
            .values(
                status="error",
                quality_report={"error": str(e)},
            )
        )
        await db.commit()
        raise
