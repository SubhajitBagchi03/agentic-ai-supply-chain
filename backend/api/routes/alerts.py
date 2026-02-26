"""
Alert API routes — exposes monitoring alerts to the frontend.
"""

from fastapi import APIRouter, Query

from monitoring.alert_store import alert_store


router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def get_alerts(unread_only: bool = Query(False), limit: int = Query(50)):
    """Get all alerts, optionally filtered to unread only."""
    return {
        "alerts": alert_store.get_alerts(unread_only=unread_only, limit=limit),
        "unread_count": alert_store.get_unread_count(),
    }


@router.get("/unread-count")
async def get_unread_count():
    """Get unread alert count for badge display."""
    return {"count": alert_store.get_unread_count()}


@router.post("/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    """Mark a single alert as read."""
    success = alert_store.mark_read(alert_id)
    return {"success": success}


@router.post("/read-all")
async def mark_all_read():
    """Mark all alerts as read."""
    alert_store.mark_all_read()
    return {"success": True}
