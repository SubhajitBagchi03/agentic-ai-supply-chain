"""
Analytics endpoint — serves live KPIs and chart data from in-memory Pandas DataFrames.
GET /analytics/dashboard
GET /analytics/decisions/<sku>
"""

import math
from fastapi import APIRouter, HTTPException

from data.store import data_store
from utils.logger import api_logger

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _safe(val):
    """Convert numpy/pandas types to plain Python for JSON serialization."""
    if val is None:
        return None
    try:
        if math.isnan(val) or math.isinf(val):
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(val, "item"):          # numpy scalar
        return val.item()
    return val


@router.get("/dashboard")
async def dashboard_analytics():
    """
    Returns computed KPIs and chart-ready data from the live datasets.
    This runs entirely from RAM — no database queries.
    """
    inv = data_store.get_inventory()
    sup = data_store.get_supplier()
    shp = data_store.get_shipment()

    kpis = {}
    charts = {}

    # ── Inventory KPIs ──────────────────────────
    if not inv.empty:
        total_items = len(inv)
        low_stock = inv[inv["on_hand"] <= inv["safety_stock"]] if "on_hand" in inv.columns and "safety_stock" in inv.columns else None

        stockout_count = len(low_stock) if low_stock is not None else 0
        stockout_pct = round((stockout_count / total_items) * 100, 1) if total_items > 0 else 0

        # Days of supply = on_hand / avg_daily_demand
        if "avg_daily_demand" in inv.columns:
            valid = inv[inv["avg_daily_demand"] > 0]
            if not valid.empty:
                avg_dos = (valid["on_hand"] / valid["avg_daily_demand"]).mean()
            else:
                avg_dos = 0
        else:
            avg_dos = 0

        # Fill Rate: % of items where on_hand > 0
        in_stock = len(inv[inv["on_hand"] > 0]) if "on_hand" in inv.columns else 0
        fill_rate = round((in_stock / total_items) * 100, 1) if total_items > 0 else 0

        kpis["stockout_risk"] = _safe(stockout_pct)
        kpis["days_of_supply"] = _safe(round(avg_dos, 1))
        kpis["fill_rate"] = _safe(fill_rate)
        kpis["total_skus"] = total_items
        kpis["low_stock_count"] = stockout_count

        # ── Inventory Health Chart: on_hand vs safety_stock per SKU ──
        chart_data = []
        for _, row in inv.iterrows():
            chart_data.append({
                "sku": str(row.get("sku", "")),
                "name": str(row.get("name", row.get("sku", "")))[:20],
                "on_hand": _safe(row.get("on_hand", 0)),
                "safety_stock": _safe(row.get("safety_stock", 0)),
            })
        charts["inventory_health"] = chart_data

        # ── Risk Distribution Chart ──
        critical = stockout_count
        at_risk = 0
        if "on_hand" in inv.columns and "safety_stock" in inv.columns:
            at_risk_df = inv[(inv["on_hand"] > inv["safety_stock"]) & (inv["on_hand"] <= inv["safety_stock"] * 1.5)]
            at_risk = len(at_risk_df)
        healthy = total_items - critical - at_risk
        charts["risk_distribution"] = [
            {"name": "Critical", "value": critical, "color": "#ef4444"},
            {"name": "At Risk", "value": max(0, at_risk), "color": "#f59e0b"},
            {"name": "Healthy", "value": max(0, healthy), "color": "#22c55e"},
        ]
    else:
        kpis["stockout_risk"] = 0
        kpis["days_of_supply"] = 0
        kpis["fill_rate"] = 0
        kpis["total_skus"] = 0
        kpis["low_stock_count"] = 0
        charts["inventory_health"] = []
        charts["risk_distribution"] = []

    # ── Supplier KPIs ──────────────────────────
    if not sup.empty:
        if "on_time_rate" in sup.columns:
            avg_otr = round(sup["on_time_rate"].mean() * 100, 1)
        else:
            avg_otr = 0
        kpis["avg_on_time_rate"] = _safe(avg_otr)
        kpis["total_suppliers"] = len(sup)

        # Supplier Comparison Chart
        sup_chart = []
        for _, row in sup.iterrows():
            sup_chart.append({
                "name": str(row.get("name", row.get("supplier_id", "")))[:15],
                "on_time": _safe(round(float(row.get("on_time_rate", 0)) * 100, 0)),
                "quality": _safe(round(float(row.get("quality_score", 0)) * 100, 0)),
                "cost": _safe(round(float(row.get("cost_index", 0)), 0)),
            })
        charts["supplier_comparison"] = sup_chart
    else:
        kpis["avg_on_time_rate"] = 0
        kpis["total_suppliers"] = 0
        charts["supplier_comparison"] = []

    # ── Shipment KPIs ──────────────────────────
    if not shp.empty:
        if "status" in shp.columns:
            delayed = len(shp[shp["status"].str.lower().str.contains("delay", na=False)])
            on_time_ship = len(shp) - delayed
        else:
            delayed = 0
            on_time_ship = len(shp)
        kpis["shipments_on_time"] = on_time_ship
        kpis["shipments_delayed"] = delayed
        kpis["total_shipments"] = len(shp)
    else:
        kpis["shipments_on_time"] = 0
        kpis["shipments_delayed"] = 0
        kpis["total_shipments"] = 0

    return {"kpis": kpis, "charts": charts}


@router.get("/decisions/{sku}")
async def sku_decisions(sku: str):
    """
    Deep-dive decision analysis for a specific SKU.
    Cross-references all loaded datasets to build a full reasoning chain.
    """
    inv = data_store.get_inventory()
    sup = data_store.get_supplier()
    shp = data_store.get_shipment()

    result = {"sku": sku, "found": False, "inventory": None, "suppliers": [], "shipments": [], "risk_factors": [], "recommendations": []}

    # ── Inventory lookup ──
    if not inv.empty and "sku" in inv.columns:
        match = inv[inv["sku"].astype(str).str.upper() == sku.upper()]
        if not match.empty:
            row = match.iloc[0]
            result["found"] = True
            on_hand = float(row.get("on_hand", 0))
            safety = float(row.get("safety_stock", 0))
            demand = float(row.get("avg_daily_demand", 0))
            lead = float(row.get("lead_time_days", 0))
            dos = round(on_hand / demand, 1) if demand > 0 else None

            result["inventory"] = {
                "name": str(row.get("name", sku)),
                "warehouse": str(row.get("warehouse", "N/A")),
                "on_hand": _safe(on_hand),
                "safety_stock": _safe(safety),
                "avg_daily_demand": _safe(demand),
                "lead_time_days": _safe(lead),
                "days_of_supply": _safe(dos),
                "status": "CRITICAL" if on_hand <= safety else ("AT RISK" if on_hand <= safety * 1.5 else "HEALTHY"),
            }

            # Risk factors
            if on_hand <= safety:
                result["risk_factors"].append(f"Stock ({on_hand}) is at or below safety stock ({safety})")
            if dos is not None and dos < lead:
                result["risk_factors"].append(f"Days of supply ({dos}) is less than lead time ({lead} days) — stockout imminent")
            if demand > 0 and on_hand / demand < 7:
                result["risk_factors"].append(f"Less than 1 week of stock remaining at current consumption rate")

            # Recommendations
            if on_hand <= safety:
                reorder_qty = max(0, (demand * lead * 1.5) - on_hand)
                result["recommendations"].append(f"URGENT: Reorder {round(reorder_qty)} units immediately")
            if dos is not None and dos < lead:
                result["recommendations"].append("Consider expedited shipping to avoid stockout")

    # ── Supplier cross-reference ──
    if not sup.empty and result["found"] and "supplier_id" in inv.columns:
        supplier_id = str(match.iloc[0].get("supplier_id", ""))
        if supplier_id:
            sup_match = sup[sup["supplier_id"].astype(str) == supplier_id]
            if not sup_match.empty:
                s = sup_match.iloc[0]
                result["suppliers"].append({
                    "supplier_id": supplier_id,
                    "name": str(s.get("name", supplier_id)),
                    "on_time_rate": _safe(float(s.get("on_time_rate", 0))),
                    "quality_score": _safe(float(s.get("quality_score", 0))),
                    "lead_time": _safe(float(s.get("lead_time", 0))),
                })

    # ── Shipment cross-reference ──
    if not shp.empty and "sku" in shp.columns:
        shp_match = shp[shp["sku"].astype(str).str.upper() == sku.upper()]
        for _, s in shp_match.iterrows():
            result["shipments"].append({
                "shipment_id": str(s.get("shipment_id", "")),
                "status": str(s.get("status", "")),
                "origin": str(s.get("origin", "")),
                "destination": str(s.get("destination", "")),
                "quantity": _safe(s.get("quantity", 0)),
            })
            if "delay" in str(s.get("status", "")).lower():
                result["risk_factors"].append(f"Shipment {s.get('shipment_id', '')} is delayed")

    if not result["found"]:
        result["risk_factors"].append(f"SKU '{sku}' not found in inventory. It may be an unregistered or ghost SKU.")
        result["recommendations"].append("Verify the SKU exists in the system or upload inventory data containing this SKU.")

    return result
