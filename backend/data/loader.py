"""
Data loader utilities for reading CSV files into Pandas DataFrames.
"""

import io
import pandas as pd

from utils.errors import DataError
from utils.logger import data_logger


async def load_csv_from_upload(file_content: bytes, filename: str) -> pd.DataFrame:
    """
    Parse CSV file content into a Pandas DataFrame.
    
    Args:
        file_content: Raw bytes from uploaded file
        filename: Original filename for logging
    
    Returns:
        Parsed DataFrame
    
    Raises:
        DataError: If file cannot be parsed as CSV
    """
    try:
        # Try UTF-8 first, fallback to latin-1 for encoding issues
        try:
            df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8")
        except UnicodeDecodeError:
            data_logger.warning(f"UTF-8 decode failed for {filename}, trying latin-1")
            df = pd.read_csv(io.BytesIO(file_content), encoding="latin-1")

        # Strip whitespace from string columns
        for col in df.select_dtypes(include=["object"]).columns:
            df[col] = df[col].str.strip()

        data_logger.info(f"Loaded CSV '{filename}': {len(df)} rows, {len(df.columns)} columns")
        return df

    except pd.errors.EmptyDataError:
        raise DataError(f"File '{filename}' is empty or contains no data")
    except pd.errors.ParserError as e:
        raise DataError(f"Failed to parse '{filename}' as CSV: {str(e)}")
    except Exception as e:
        raise DataError(f"Unexpected error loading '{filename}': {str(e)}")
