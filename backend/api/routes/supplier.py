"""
Supplier dataset upload endpoint.
POST /supplier/upload
"""

from fastapi import APIRouter, UploadFile, File, HTTPException

from data.loader import load_csv_from_upload
from data.validator import validate_dataset
from data.store import data_store
from data.schemas import UploadResponse
from utils.errors import SchemaValidationError, DataError
from utils.logger import api_logger
from config import settings

router = APIRouter(prefix="/supplier", tags=["Supplier"])


@router.post("/upload", response_model=UploadResponse)
async def upload_supplier(file: UploadFile = File(...)):
    """
    Upload supplier CSV dataset.
    
    Expected columns: supplier_id, name, cost_index, lead_time,
    on_time_rate, quality_score, risk_score
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f}MB). Maximum: {settings.max_file_size_mb}MB"
        )

    try:
        df = await load_csv_from_upload(content, file.filename)
        df, warnings = await validate_dataset(df, "supplier")
        data_store.set_supplier(df)

        api_logger.info(
            f"Supplier upload successful: {len(df)} rows",
            extra={"details": {"filename": file.filename, "rows": len(df)}}
        )

        return UploadResponse(
            status="success",
            message=f"Supplier data loaded successfully: {len(df)} rows",
            rows_loaded=len(df),
            warnings=warnings,
            dataset_type="supplier"
        )

    except SchemaValidationError as e:
        raise HTTPException(status_code=422, detail={
            "error": e.message,
            "missing_columns": e.details.get("missing_columns", []),
            "extra_columns": e.details.get("extra_columns", []),
        })
    except DataError as e:
        raise HTTPException(status_code=400, detail=e.message)
