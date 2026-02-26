"""
In-memory data store for structured datasets.
Thread-safe singleton holding Pandas DataFrames for each dataset type.
"""

import threading
import pandas as pd
from typing import Optional, Dict

from utils.logger import data_logger


class DataStore:
    """
    Thread-safe in-memory store for supply chain datasets.
    
    Holds separate DataFrames for inventory, supplier, shipment, and demand data.
    Follows the dataset separation principle from PROJECT_GUIDELINES.md.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._data: Dict[str, pd.DataFrame] = {
            "inventory": pd.DataFrame(),
            "supplier": pd.DataFrame(),
            "shipment": pd.DataFrame(),
            "demand": pd.DataFrame(),
        }
        self._metadata: Dict[str, dict] = {}
        self._store_lock = threading.Lock()
        self._initialized = True
        data_logger.info("DataStore initialized")

    # --- Setters ---

    def set_inventory(self, df: pd.DataFrame):
        """Store inventory dataset."""
        with self._store_lock:
            self._data["inventory"] = df.copy()
            self._metadata["inventory"] = {
                "rows": len(df),
                "columns": df.columns.tolist(),
            }
        data_logger.info(f"Inventory data stored: {len(df)} rows")

    def set_supplier(self, df: pd.DataFrame):
        """Store supplier dataset."""
        with self._store_lock:
            self._data["supplier"] = df.copy()
            self._metadata["supplier"] = {
                "rows": len(df),
                "columns": df.columns.tolist(),
            }
        data_logger.info(f"Supplier data stored: {len(df)} rows")

    def set_shipment(self, df: pd.DataFrame):
        """Store shipment dataset."""
        with self._store_lock:
            self._data["shipment"] = df.copy()
            self._metadata["shipment"] = {
                "rows": len(df),
                "columns": df.columns.tolist(),
            }
        data_logger.info(f"Shipment data stored: {len(df)} rows")

    def set_demand(self, df: pd.DataFrame):
        """Store demand/sales dataset."""
        with self._store_lock:
            self._data["demand"] = df.copy()
            self._metadata["demand"] = {
                "rows": len(df),
                "columns": df.columns.tolist(),
            }
        data_logger.info(f"Demand data stored: {len(df)} rows")

    # --- Getters ---

    def get_inventory(self) -> pd.DataFrame:
        """Get inventory dataset (returns copy)."""
        with self._store_lock:
            return self._data["inventory"].copy()

    def get_supplier(self) -> pd.DataFrame:
        """Get supplier dataset (returns copy)."""
        with self._store_lock:
            return self._data["supplier"].copy()

    def get_shipment(self) -> pd.DataFrame:
        """Get shipment dataset (returns copy)."""
        with self._store_lock:
            return self._data["shipment"].copy()

    def get_demand(self) -> pd.DataFrame:
        """Get demand dataset (returns copy)."""
        with self._store_lock:
            return self._data["demand"].copy()

    # --- Status ---

    def get_status(self) -> dict:
        """Get summary of loaded datasets."""
        with self._store_lock:
            return {
                dataset: {
                    "loaded": not self._data[dataset].empty,
                    "rows": len(self._data[dataset]),
                }
                for dataset in self._data
            }

    def has_data(self, dataset_type: str) -> bool:
        """Check if a dataset has been loaded."""
        with self._store_lock:
            return dataset_type in self._data and not self._data[dataset_type].empty

    def clear(self, dataset_type: Optional[str] = None):
        """Clear one or all datasets."""
        with self._store_lock:
            if dataset_type:
                if dataset_type in self._data:
                    self._data[dataset_type] = pd.DataFrame()
                    self._metadata.pop(dataset_type, None)
                    data_logger.info(f"Cleared {dataset_type} data")
            else:
                for key in self._data:
                    self._data[key] = pd.DataFrame()
                self._metadata.clear()
                data_logger.info("All datasets cleared")


# Singleton instance
data_store = DataStore()
