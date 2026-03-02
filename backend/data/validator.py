"""
CSV data validator for supply chain datasets.
Validates schema, detects anomalies, and returns actionable reports.
"""

import pandas as pd
from typing import Tuple

from data.schemas import (
    INVENTORY_REQUIRED_COLUMNS,
    SUPPLIER_REQUIRED_COLUMNS,
    SHIPMENT_REQUIRED_COLUMNS,
    DEMAND_REQUIRED_COLUMNS,
)
from utils.errors import SchemaValidationError, DataAnomalyError
from utils.logger import data_logger


# Column mapping for each dataset type
SCHEMA_MAP = {
    "inventory": INVENTORY_REQUIRED_COLUMNS,
    "supplier": SUPPLIER_REQUIRED_COLUMNS,
    "shipment": SHIPMENT_REQUIRED_COLUMNS,
    "demand": DEMAND_REQUIRED_COLUMNS,
}


async def _map_columns_with_llm(actual_columns: list, required_columns: list) -> dict:
    import json
    from langchain_groq import ChatGroq
    from config import settings
    
    try:
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name=settings.groq_model,
            temperature=0.0
        )
        
        prompt = f"""You are a data engineering assistant.
Your task is to map a list of ACTUAL columns from an uploaded CSV to a target list of REQUIRED columns for a database schema.

ACTUAL COLUMNS (from CSV): {actual_columns}
REQUIRED COLUMNS (Target Schema): {required_columns}

Output ONLY a valid JSON dictionary where the keys are the ACTUAL column names and the values are their corresponding REQUIRED column names. Look for semantic matches (e.g., 'Item Code' -> 'sku', 'Current Stock' -> 'on_hand', 'Delivery Status' -> 'status'). Do not map an actual column if it does not semantically match any required column. ONLY output JSON, no markdown formatting.
"""
        response = llm.invoke(prompt)
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        mapping = json.loads(content)
        # Keep only valid targets
        valid_mapping = {k: v for k, v in mapping.items() if v in required_columns}
        return valid_mapping
    except Exception as e:
        data_logger.error(f"LLM Schema Mapping failed: {str(e)}")
        return {}


def _scrub_data_types(df: pd.DataFrame) -> pd.DataFrame:
    """Scrub messy data types (e.g., $1,500.00 -> 1500.0) across all columns."""
    for col in df.columns:
        # Remove entirely string contents like $ and , from what might be numbers
        cleaned = df[col].astype(str).str.replace(r'[$,£€% ]', '', regex=True)
        # Try to convert to numeric, coerce errors to NaN
        temp = pd.to_numeric(cleaned, errors='coerce')
        
        # If the column was genuinely mostly numbers (like a stripped currency column)
        # then at least 50% of the non-null rows will successfully cast to valid floats.
        if len(cleaned) > 0 and (temp.notna().sum() / len(cleaned)) > 0.5:
            df[col] = temp
    return df


async def validate_csv_schema(df: pd.DataFrame, dataset_type: str) -> list:
    """
    Validate that DataFrame has required columns for the dataset type.
    Uses AI semantic mapping to map dynamic headers if there's a mismatch.
    """
    required = SCHEMA_MAP.get(dataset_type)
    if not required:
        raise SchemaValidationError(f"Unknown dataset type: {dataset_type}")

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    actual = set(df.columns.tolist())
    required_set = set(required)

    missing = required_set - actual
    extra = actual - required_set

    warnings = []

    if missing:
        data_logger.info(f"Schema mismatch detected. Triggering AI Column Mapping for {dataset_type}...")
        mapping = await _map_columns_with_llm(list(actual), required)
        if mapping:
            data_logger.info(f"AI Column Mapping result: {mapping}")
            df.rename(columns=mapping, inplace=True)
            # Re-evaluate
            actual = set(df.columns.tolist())
            missing = required_set - actual
            extra = actual - required_set
            warnings.append(f"AI Column Mapping successfully applied: {mapping}")

    if missing:
        raise SchemaValidationError(
            f"Missing required columns for {dataset_type} dataset",
            missing_columns=list(missing),
            extra_columns=list(extra),
        )

    if extra:
        warnings.append(f"Extra columns found (will be ignored): {list(extra)}")

    if df.empty:
        warnings.append("Dataset is empty (0 rows)")

    data_logger.info(
        f"Schema validation passed for {dataset_type}: {len(df)} rows",
        extra={"details": {"dataset_type": dataset_type, "rows": len(df)}}
    )

    return warnings


def validate_inventory_data(df: pd.DataFrame) -> list:
    """
    Validate inventory-specific data quality.
    
    Checks for edge cases defined in PROJECT_OVERVIEW.md:
    - Negative stock
    - Missing demand
    - Lead time zero
    - Duplicate SKU
    """
    warnings = []

    # Duplicate SKUs
    dup_skus = df[df.duplicated(subset=["sku"], keep=False)]
    if not dup_skus.empty:
        dup_list = dup_skus["sku"].unique().tolist()
        warnings.append(f"Duplicate SKUs detected: {dup_list}")

    # Negative stock
    negative = df[df["on_hand"] < 0]
    if not negative.empty:
        skus = negative["sku"].tolist()
        warnings.append(f"ANOMALY: Negative stock for SKUs: {skus}")

    # Missing demand
    missing_demand = df[df["avg_daily_demand"].isna() | (df["avg_daily_demand"] <= 0)]
    if not missing_demand.empty:
        skus = missing_demand["sku"].tolist()
        warnings.append(f"Missing or zero demand for SKUs: {skus}. Will estimate using rolling average.")

    # Lead time zero or negative
    bad_lead = df[df["lead_time_days"] <= 0]
    if not bad_lead.empty:
        skus = bad_lead["sku"].tolist()
        warnings.append(f"Invalid lead time (≤0) for SKUs: {skus}. Defaulting to 1 day.")

    return warnings


def validate_supplier_data(df: pd.DataFrame) -> list:
    """Validate supplier-specific data quality."""
    warnings = []

    # Duplicate supplier IDs
    dups = df[df.duplicated(subset=["supplier_id"], keep=False)]
    if not dups.empty:
        warnings.append(f"Duplicate supplier IDs: {dups['supplier_id'].unique().tolist()}")

    # Missing metrics
    for col in ["cost_index", "on_time_rate", "quality_score"]:
        missing = df[df[col].isna()]
        if not missing.empty:
            ids = missing["supplier_id"].tolist()
            warnings.append(f"Missing {col} for suppliers: {ids}. Will penalize in scoring.")

    # Out of range values
    if (df["on_time_rate"] > 1.0).any() or (df["on_time_rate"] < 0).any():
        warnings.append("on_time_rate values outside 0-1 range detected")

    if (df["quality_score"] > 1.0).any() or (df["quality_score"] < 0).any():
        warnings.append("quality_score values outside 0-1 range detected")

    return warnings


def validate_shipment_data(df: pd.DataFrame) -> list:
    """Validate shipment-specific data quality."""
    warnings = []

    # Duplicate shipment IDs
    dups = df[df.duplicated(subset=["shipment_id"], keep=False)]
    if not dups.empty:
        warnings.append(f"Duplicate shipment IDs: {dups['shipment_id'].unique().tolist()}")

    # Invalid status values
    valid_statuses = {"in_transit", "delivered", "delayed", "lost", "pending"}
    if "status" in df.columns:
        invalid = df[~df["status"].str.lower().isin(valid_statuses)]
        if not invalid.empty:
            warnings.append(f"Invalid shipment statuses found: {invalid['status'].unique().tolist()}")

    return warnings


def validate_demand_data(df: pd.DataFrame) -> list:
    """Validate demand/sales data quality."""
    warnings = []

    # Negative quantities
    negative = df[df["quantity"] < 0]
    if not negative.empty:
        warnings.append(f"Negative demand quantities in {len(negative)} rows")

    # Missing dates
    if df["date"].isna().any():
        warnings.append("Some demand records have missing dates")

    return warnings


async def validate_dataset(df: pd.DataFrame, dataset_type: str) -> Tuple[pd.DataFrame, list]:
    """
    Full validation pipeline: schema + data quality.
    
    Args:
        df: Raw DataFrame from CSV upload
        dataset_type: One of 'inventory', 'supplier', 'shipment', 'demand'
    
    Returns:
        Tuple of (cleaned DataFrame, list of warnings)
    """
    # Normalize columns
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Schema validation
    warnings = await validate_csv_schema(df, dataset_type)

    # Data type scrubbing (The Clean Room)
    df = _scrub_data_types(df)

    # Data quality validation
    quality_validators = {
        "inventory": validate_inventory_data,
        "supplier": validate_supplier_data,
        "shipment": validate_shipment_data,
        "demand": validate_demand_data,
    }

    validator = quality_validators.get(dataset_type)
    if validator:
        quality_warnings = validator(df)
        warnings.extend(quality_warnings)

    return df, warnings
