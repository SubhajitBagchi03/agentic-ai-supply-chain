"""
Google Sheets live data import — reads public CSV export URLs.

Accepts Google Sheet URLs for each dataset type, converts them to CSV export URLs,
loads data, and stores URLs for periodic refresh by the monitoring loop.
"""

import pandas as pd
import re
from io import StringIO
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from data.validator import validate_dataset
from data.store import data_store
from utils.errors import SchemaValidationError
from utils.logger import api_logger

router = APIRouter(prefix="/sheets", tags=["Google Sheets"])


# Store sheet URLs for periodic refresh
_sheet_urls: dict = {}


def _to_csv_export_url(url: str, gid: str = "0") -> str:
    """
    Convert a Google Sheets URL to its CSV export URL.

    Supports formats:
    - https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
    - https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
    - https://docs.google.com/spreadsheets/d/SHEET_ID/pub?output=csv
    - Direct CSV export URLs (returned as-is)
    """
    # Already a CSV export URL
    if "output=csv" in url:
        return url

    # Extract sheet ID
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9_-]+)', url)
    if not match:
        raise ValueError(f"Could not extract Google Sheet ID from URL: {url}")

    sheet_id = match.group(1)

    # Extract gid if present in URL
    gid_match = re.search(r'[#?&]gid=(\d+)', url)
    if gid_match:
        gid = gid_match.group(1)

    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"


async def _fetch_sheet_data(url: str) -> pd.DataFrame:
    """Fetch CSV data from a Google Sheet export URL."""
    try:
        csv_url = _to_csv_export_url(url)
        df = pd.read_csv(csv_url)
        if df.empty:
            raise ValueError("Sheet returned empty data")
        return df
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch Google Sheet: {str(e)}"
        )


class SheetLinkRequest(BaseModel):
    url: str
    dataset_type: str  # inventory | supplier | shipment | demand
    gid: Optional[str] = "0"


class SheetLinkBatchRequest(BaseModel):
    sheets: list[SheetLinkRequest]


class SheetStatusResponse(BaseModel):
    connected: dict


@router.post("/connect")
async def connect_sheet(req: SheetLinkRequest):
    """
    Connect a Google Sheet as a live data source for a dataset type.
    The sheet must be published or shared with "Anyone with the link".
    """
    valid_types = {"inventory", "supplier", "shipment", "demand"}
    if req.dataset_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid dataset type. Must be one of: {valid_types}")

    try:
        csv_url = _to_csv_export_url(req.url, req.gid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Fetch and validate
    df = await _fetch_sheet_data(req.url)

    try:
        df, warnings = validate_dataset(df, req.dataset_type)
    except SchemaValidationError as e:
        raise HTTPException(status_code=422, detail={
            "error": e.message,
            "missing_columns": e.details.get("missing_columns", []),
        })

    # Store data
    setter = getattr(data_store, f"set_{req.dataset_type}", None)
    if setter:
        setter(df)

    # Store URL for periodic refresh
    _sheet_urls[req.dataset_type] = csv_url

    api_logger.info(f"Google Sheet connected for {req.dataset_type}: {len(df)} rows")

    return {
        "status": "success",
        "message": f"Google Sheet connected for {req.dataset_type}: {len(df)} rows loaded",
        "rows_loaded": len(df),
        "dataset_type": req.dataset_type,
        "warnings": warnings,
        "refresh_url": csv_url,
    }


@router.post("/connect-batch")
async def connect_batch(req: SheetLinkBatchRequest):
    """Connect multiple Google Sheets at once."""
    results = []
    for sheet in req.sheets:
        try:
            result = await connect_sheet(sheet)
            results.append(result)
        except HTTPException as e:
            results.append({
                "status": "error",
                "dataset_type": sheet.dataset_type,
                "error": str(e.detail),
            })
    return {"results": results}


@router.post("/refresh")
async def refresh_all():
    """Refresh all connected Google Sheets (re-fetch data)."""
    if not _sheet_urls:
        return {"message": "No sheets connected", "refreshed": []}

    refreshed = []
    errors = []

    for dataset_type, csv_url in _sheet_urls.items():
        try:
            df = pd.read_csv(csv_url)
            df, _ = validate_dataset(df, dataset_type)
            setter = getattr(data_store, f"set_{dataset_type}", None)
            if setter:
                setter(df)
            refreshed.append({"dataset_type": dataset_type, "rows": len(df)})
            api_logger.info(f"Sheet refreshed: {dataset_type} ({len(df)} rows)")
        except Exception as e:
            errors.append({"dataset_type": dataset_type, "error": str(e)})
            api_logger.error(f"Sheet refresh failed for {dataset_type}: {e}")

    return {"refreshed": refreshed, "errors": errors}


@router.get("/status")
async def get_sheet_status():
    """Get which datasets have Google Sheets connected."""
    return {
        "connected": {
            dtype: {"url": url, "active": True}
            for dtype, url in _sheet_urls.items()
        }
    }


@router.delete("/disconnect/{dataset_type}")
async def disconnect_sheet(dataset_type: str):
    """Disconnect a Google Sheet from a dataset type."""
    if dataset_type in _sheet_urls:
        del _sheet_urls[dataset_type]
        return {"status": "success", "message": f"Disconnected {dataset_type} sheet"}
    raise HTTPException(status_code=404, detail=f"No sheet connected for {dataset_type}")


def get_connected_urls() -> dict:
    """Get all connected sheet URLs (used by monitoring loop)."""
    return dict(_sheet_urls)
