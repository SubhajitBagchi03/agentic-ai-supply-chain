"""
Background monitoring loop — the system "heartbeat".

Runs every 30 seconds, checks loaded datasets via agents,
detects anomalies, and pushes alerts to the AlertStore.
"""

import asyncio
from datetime import datetime, timezone

from utils.logger import api_logger
from data.store import data_store
from monitoring.alert_store import alert_store


class MonitoringLoop:
    """
    Continuous monitoring loop that runs agent checks in the background.
    Detects: low stock, shipment delays, risk signals.
    """

    INTERVAL_SECONDS = 30

    def __init__(self):
        self._task: asyncio.Task | None = None
        self._running = False
        self._tick_count = 0

    async def start(self):
        """Start the monitoring background task."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        api_logger.info("Monitoring loop started (interval: %ds)", self.INTERVAL_SECONDS)

    async def stop(self):
        """Stop the monitoring background task."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        api_logger.info("Monitoring loop stopped")

    async def _loop(self):
        """Main heartbeat loop."""
        # Wait a few seconds on startup before first tick
        await asyncio.sleep(5)

        while self._running:
            try:
                self._tick_count += 1
                api_logger.debug("Monitor tick #%d", self._tick_count)

                # Refresh Google Sheets data if connected
                await self._refresh_sheets()

                await self._check_inventory()
                await self._check_shipments()
                await self._check_risk()

            except Exception as e:
                api_logger.error("Monitor tick error: %s", str(e))

            await asyncio.sleep(self.INTERVAL_SECONDS)

    # ── Google Sheets Refresh ──────────────────────────────────────────

    async def _refresh_sheets(self):
        """Re-fetch data from connected Google Sheets."""
        try:
            from api.routes.sheets import get_connected_urls
            import pandas as pd

            urls = get_connected_urls()
            if not urls:
                return

            for dataset_type, csv_url in urls.items():
                try:
                    df = pd.read_csv(csv_url)
                    from data.validator import validate_dataset
                    df, _ = validate_dataset(df, dataset_type)
                    setter = getattr(data_store, f"set_{dataset_type}", None)
                    if setter:
                        setter(df)
                    api_logger.debug("Sheet refreshed: %s (%d rows)", dataset_type, len(df))
                except Exception as e:
                    api_logger.warning("Sheet refresh failed for %s: %s", dataset_type, str(e))
        except Exception as e:
            api_logger.debug("Sheet refresh skipped: %s", str(e))

    # ── Inventory Checks ──────────────────────────────────────────────

    async def _check_inventory(self):
        """Detect low stock and demand spike risks."""
        if not data_store.has_data("inventory"):
            return

        df = data_store.get_inventory()

        # Required columns check
        required = {"sku", "name", "on_hand", "safety_stock"}
        if not required.issubset(set(df.columns)):
            return

        # Low stock detection: on_hand < safety_stock
        low_stock = df[df["on_hand"] < df["safety_stock"]]

        for _, row in low_stock.iterrows():
            sku = row.get("sku", "?")
            name = row.get("name", sku)
            on_hand = int(row.get("on_hand", 0))
            safety = int(row.get("safety_stock", 0))
            deficit = safety - on_hand

            severity = "critical" if on_hand == 0 else "warning"
            alert_store.add_alert(
                alert_type="low_stock",
                severity=severity,
                title=f"Low Stock: {name}",
                message=f"SKU {sku} has {on_hand} units (safety stock: {safety}, deficit: {deficit})",
                dedup_key=f"low_stock:{sku}",
                source="inventory_monitor",
            )

        # Critically low: items at zero stock
        zero_stock = df[df["on_hand"] == 0]
        if len(zero_stock) > 0:
            alert_store.add_alert(
                alert_type="low_stock",
                severity="critical",
                title=f"Stockout Alert: {len(zero_stock)} items at zero",
                message=f"{len(zero_stock)} items have completely run out of stock and need immediate reorder",
                dedup_key=f"zero_stock_count:{len(zero_stock)}",
                source="inventory_monitor",
            )

    # ── Shipment Checks ───────────────────────────────────────────────

    async def _check_shipments(self):
        """Detect delayed or at-risk shipments."""
        if not data_store.has_data("shipment"):
            return

        df = data_store.get_shipment()

        required = {"shipment_id", "status"}
        if not required.issubset(set(df.columns)):
            return

        # Delayed shipments
        delayed = df[df["status"].str.lower().isin(["delayed", "at_risk", "at risk"])]

        for _, row in delayed.iterrows():
            ship_id = row.get("shipment_id", "?")
            status = row.get("status", "unknown")
            origin = row.get("origin", "N/A")
            dest = row.get("destination", "N/A")

            severity = "critical" if status.lower() == "delayed" else "warning"
            alert_store.add_alert(
                alert_type="shipment_delay",
                severity=severity,
                title=f"Shipment {ship_id}: {status.title()}",
                message=f"Shipment from {origin} → {dest} is {status.lower()}",
                dedup_key=f"shipment:{ship_id}:{status}",
                source="shipment_monitor",
            )

        # Summary alert if multiple delays
        if len(delayed) >= 3:
            alert_store.add_alert(
                alert_type="shipment_delay",
                severity="critical",
                title=f"Multiple Shipment Delays: {len(delayed)} affected",
                message=f"{len(delayed)} shipments are currently delayed or at risk — logistics review recommended",
                dedup_key=f"multi_delay:{len(delayed)}",
                source="shipment_monitor",
            )

    # ── Risk Checks ───────────────────────────────────────────────────

    async def _check_risk(self):
        """Compute overall supply chain risk score."""
        risk_signals = []

        # Inventory risk
        if data_store.has_data("inventory"):
            df = data_store.get_inventory()
            if "on_hand" in df.columns and "safety_stock" in df.columns:
                total = len(df)
                if total > 0:
                    low = len(df[df["on_hand"] < df["safety_stock"]])
                    ratio = low / total
                    if ratio > 0.3:
                        risk_signals.append(f"inventory ({ratio:.0%} below safety stock)")

        # Shipment risk
        if data_store.has_data("shipment"):
            df = data_store.get_shipment()
            if "status" in df.columns:
                total = len(df)
                if total > 0:
                    delayed = len(df[df["status"].str.lower().isin(["delayed", "at_risk", "at risk"])])
                    ratio = delayed / total
                    if ratio > 0.2:
                        risk_signals.append(f"shipments ({ratio:.0%} delayed)")

        if len(risk_signals) >= 2:
            alert_store.add_alert(
                alert_type="risk",
                severity="critical",
                title="Elevated Supply Chain Risk",
                message=f"Multiple risk factors detected: {', '.join(risk_signals)}. Immediate review recommended.",
                dedup_key=f"risk:multi:{len(risk_signals)}",
                source="risk_monitor",
            )
        elif len(risk_signals) == 1:
            alert_store.add_alert(
                alert_type="risk",
                severity="warning",
                title="Supply Chain Risk Signal",
                message=f"Risk factor detected: {risk_signals[0]}",
                dedup_key=f"risk:single:{risk_signals[0]}",
                source="risk_monitor",
            )


# Singleton instance
monitor = MonitoringLoop()
