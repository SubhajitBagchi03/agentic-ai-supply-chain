"""
Pydantic schemas for all structured datasets.
Matches data models defined in PROJECT_OVERVIEW.md Section 4.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ============================================================
# Inventory Item Schema
# ============================================================

class InventoryItem(BaseModel):
    """Single inventory record."""
    sku: str = Field(..., description="Stock Keeping Unit identifier")
    name: str = Field(..., description="Product name")
    warehouse: str = Field(..., description="Warehouse location")
    on_hand: float = Field(..., description="Current stock quantity")
    safety_stock: float = Field(..., description="Minimum safety stock level")
    lead_time_days: float = Field(..., description="Supplier lead time in days")
    avg_daily_demand: float = Field(..., description="Average daily demand")
    supplier_id: str = Field(..., description="Primary supplier identifier")
    last_updated: Optional[str] = Field(None, description="Last data update timestamp")


INVENTORY_REQUIRED_COLUMNS = [
    "sku", "name", "warehouse", "on_hand", "safety_stock",
    "lead_time_days", "avg_daily_demand", "supplier_id"
]


# ============================================================
# Supplier Schema
# ============================================================

class Supplier(BaseModel):
    """Single supplier record."""
    supplier_id: str = Field(..., description="Unique supplier identifier")
    name: str = Field(..., description="Supplier name")
    cost_index: float = Field(..., description="Cost index (lower = cheaper)")
    lead_time: float = Field(..., description="Average lead time in days")
    on_time_rate: float = Field(..., description="On-time delivery rate (0-1)")
    quality_score: float = Field(..., description="Quality score (0-1)")
    risk_score: float = Field(..., description="Risk score (0-1, higher = riskier)")


SUPPLIER_REQUIRED_COLUMNS = [
    "supplier_id", "name", "cost_index", "lead_time",
    "on_time_rate", "quality_score", "risk_score"
]


# ============================================================
# Shipment Schema
# ============================================================

class Shipment(BaseModel):
    """Single shipment record."""
    shipment_id: str = Field(..., description="Unique shipment identifier")
    sku: str = Field(..., description="Product SKU being shipped")
    origin: str = Field(..., description="Shipment origin")
    destination: str = Field(..., description="Shipment destination")
    status: str = Field(..., description="Current status: in_transit, delivered, delayed, lost")
    planned_date: str = Field(..., description="Planned delivery date")
    actual_date: Optional[str] = Field(None, description="Actual delivery date")
    delay_days: float = Field(default=0, description="Days of delay")
    carrier: str = Field(..., description="Carrier / logistics provider")


SHIPMENT_REQUIRED_COLUMNS = [
    "shipment_id", "sku", "origin", "destination",
    "status", "planned_date", "carrier"
]


# ============================================================
# Demand / Sales Schema
# ============================================================

class DemandRecord(BaseModel):
    """Single demand/sales record."""
    sku: str = Field(..., description="Product SKU")
    date: str = Field(..., description="Date of demand record")
    quantity: float = Field(..., description="Demand quantity")
    channel: Optional[str] = Field(None, description="Sales channel")
    region: Optional[str] = Field(None, description="Geographic region")


DEMAND_REQUIRED_COLUMNS = ["sku", "date", "quantity"]


# ============================================================
# API Response Models
# ============================================================

class UploadResponse(BaseModel):
    """Response after dataset upload."""
    status: str = "success"
    message: str
    rows_loaded: int
    warnings: list = []
    dataset_type: str


class QueryRequest(BaseModel):
    """User query request."""
    query: str = Field(..., description="Natural language query", min_length=1)
    context_filter: Optional[dict] = Field(None, description="Optional metadata filters")


class AgentResponse(BaseModel):
    """Standardized agent response."""
    agent: str
    reasoning: str
    recommendation: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    data_sources: list = []
    warnings: list = []


class QueryResponse(BaseModel):
    """Full query response from orchestrator."""
    query: str
    intents_detected: list
    responses: list
    metadata: dict = {}


class HealthResponse(BaseModel):
    """System health check response."""
    status: str
    version: str = "1.0.0"
    datasets_loaded: dict = {}
    documents_indexed: int = 0
    groq_connected: bool = False


class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str
    error_code: str
    details: dict = {}
