import sqlite3
import pandas as pd
from datetime import datetime
import asyncio
from utils.logger import data_logger
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "supply_chain.db")

async def save_to_history_background(df: pd.DataFrame, dataset_type: str):
    """
    Asynchronously save valid dataset strictly for historical auditing and conflict detection.
    This does not interrupt the main RAM-based Pandas event loop.
    """
    try:
        # Run synchronous DB operation in a thread to not block the event loop
        await asyncio.to_thread(_save_to_sqlite, df, dataset_type)
    except Exception as e:
        data_logger.error(f"Failed to save history to SQLite: {e}")

def _save_to_sqlite(df: pd.DataFrame, dataset_type: str):
    # Add upload timestamp for historical tracking
    history_df = df.copy()
    history_df["upload_timestamp"] = datetime.now().isoformat()
    
    with sqlite3.connect(DB_PATH) as conn:
        history_df.to_sql(f"history_{dataset_type}", conn, if_exists="append", index=False)
        data_logger.info(f"Asynchronously appended {len(history_df)} rows to history_{dataset_type} in local SQLite.")

def get_previous_upload(dataset_type: str) -> pd.DataFrame:
    """
    Get the most recent upload chunk from SQLite for the given dataset_type.
    """
    try:
        if not os.path.exists(DB_PATH):
            return pd.DataFrame()
            
        with sqlite3.connect(DB_PATH) as conn:
            # First, check if table exists
            cursor = conn.cursor()
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='history_{dataset_type}'")
            if not cursor.fetchone():
                return pd.DataFrame()
            
            # Find the most recent timestamp
            df_time = pd.read_sql_query(f"SELECT MAX(upload_timestamp) as latest FROM history_{dataset_type}", conn)
            latest = df_time['latest'].iloc[0]
            
            if not latest:
                return pd.DataFrame()
                
            # Read only rows from the most recent upload
            df = pd.read_sql_query(f"SELECT * FROM history_{dataset_type} WHERE upload_timestamp != ?", conn, params=(latest,))
            # Wait, the logic above: if we want previous uploads, we might have multiple uploads with the latest timestamp (if they happened same second, unlikely).
            # Actually, to get the 'previous' state, we need the 2nd most recent timestamp, OR we just get all data BEFORE the latest timestamp.
            # But the 'latest' timestamp might be the currently validating chunk if we save it first. 
            # Oh wait, this function is called inside `_run_full_analysis` which happens AFTER `validate_dataset` and `save_to_history_background`.
            # So `latest` IS the current chunk. We want the previous chunk!
            
            cursor.execute(f"SELECT DISTINCT upload_timestamp FROM history_{dataset_type} ORDER BY upload_timestamp DESC LIMIT 2")
            timestamps = [r[0] for r in cursor.fetchall()]
            
            if len(timestamps) < 2:
                # No previous historical record exists (this is the first upload)
                return pd.DataFrame()
                
            previous_timestamp = timestamps[1]
            df = pd.read_sql_query(f"SELECT * FROM history_{dataset_type} WHERE upload_timestamp = ?", conn, params=(previous_timestamp,))
            return df
            
    except Exception as e:
        data_logger.error(f"Failed to read from SQLite history: {e}")
        return pd.DataFrame()
