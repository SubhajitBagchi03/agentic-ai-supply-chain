"""
Shipment Agent — monitors shipments, predicts delays, raises alerts.
Implements logic from PROJECT_OVERVIEW.md Section 5.3.
"""

import pandas as pd

from agents.base_agent import BaseAgent
from data.store import data_store
from utils.math_utils import predict_delay


class ShipmentAgent(BaseAgent):
    """
    Shipment tracking and delay prediction agent.
    
    Functions:
    - Detect delay risk
    - Predict arrival
    - Shipment monitoring
    - Escalation alerts
    - Suggest reroute
    """

    def __init__(self):
        super().__init__("Shipment Agent")

    async def analyze(self, query: str, **kwargs) -> dict:
        """Run shipment analysis."""
        self.log_analysis_start(query)

        if not data_store.has_data("shipment"):
            return self.log_no_data("shipment")

        shipment_df = data_store.get_shipment()
        
        # Extract specific shipment IDs from query to focus analysis
        import re
        mentioned_ships = re.findall(r'SHP\d+', query, re.IGNORECASE)
        mentioned_ships = [s.upper() for s in mentioned_ships]
        
        if mentioned_ships:
            # Filter DF but keep the original for summary stats if needed later
            focus_df = shipment_df[shipment_df['shipment_id'].isin(mentioned_ships)]
            if not focus_df.empty:
                shipment_df = focus_df

        analysis = self._run_full_analysis(shipment_df)

        rag_context = self.get_rag_context(query)
        llm_response = await self._synthesize_with_llm(query, analysis, rag_context)

        return self.format_response(
            reasoning=llm_response.get("reasoning", ""),
            recommendation=llm_response.get("recommendation", ""),
            confidence=llm_response.get("confidence", 0.7),
            data_sources=["shipment_dataset"] + (
                rag_context.get("sources", []) if rag_context.get("has_context") else []
            ),
            warnings=analysis.get("warnings", []),
            extra=analysis,
        )

    def _run_full_analysis(self, shipment_df: pd.DataFrame) -> dict:
        """Run shipment status analysis and delay detection."""
        results = {
            "status_breakdown": {},
            "delayed_shipments": [],
            "at_risk_shipments": [],
            "lost_shipments": [],
            "warnings": [],
            "summary": {},
        }

        # Status breakdown
        status_counts = shipment_df["status"].str.lower().value_counts().to_dict()
        results["status_breakdown"] = status_counts

        inventory_df = data_store.get_inventory() if data_store.has_data("inventory") else None

        for _, row in shipment_df.iterrows():
            shipment_id = row["shipment_id"]
            status = str(row["status"]).lower()
            delay_days = float(row.get("delay_days", 0))

            # Delayed shipments
            if status == "delayed" or delay_days > 0:
                delay_info = predict_delay(
                    carrier_avg_delay=delay_days,
                    weather_factor=0,  # Placeholder — would come from external API
                    congestion_factor=0,
                )

                # Cascade Risk Detection
                cascade_risk = None
                if inventory_df is not None and not inventory_df.empty:
                    sku_inv = inventory_df[inventory_df["sku"] == row.get("sku", "")]
                    if not sku_inv.empty:
                        inv_row = sku_inv.iloc[0]
                        on_hand = float(inv_row["on_hand"])
                        avg_demand = float(inv_row["avg_daily_demand"])
                        if avg_demand > 0:
                            days_until_stockout = on_hand / avg_demand
                            if days_until_stockout < delay_info["predicted_delay_days"]:
                                cascade_risk = {
                                    "days_until_stockout": round(days_until_stockout, 1),
                                    "predicted_delay": delay_info["predicted_delay_days"],
                                    "dry_stock_days": round(delay_info["predicted_delay_days"] - days_until_stockout, 1)
                                }

                shipment_info = {
                    "shipment_id": shipment_id,
                    "sku": row.get("sku", ""),
                    "origin": row.get("origin", ""),
                    "destination": row.get("destination", ""),
                    "carrier": row.get("carrier", ""),
                    "planned_date": str(row.get("planned_date", "")),
                    "delay_days": delay_days,
                    "severity": delay_info["severity"],
                    "predicted_delay": delay_info["predicted_delay_days"],
                    "cascade_risk": cascade_risk,
                }

                results["delayed_shipments"].append(shipment_info)

                if cascade_risk:
                    results["warnings"].append(
                        f"CRITICAL CASCADE RISK: Shipment {shipment_id} delay will cause a stockout for SME {row.get('sku')} for {cascade_risk['dry_stock_days']} days."
                    )
                elif delay_info["severity"] in ("high", "critical"):
                    results["warnings"].append(
                        f"{'CRITICAL' if delay_info['severity'] == 'critical' else 'HIGH'}: "
                        f"Shipment {shipment_id} delayed {delay_days} days"
                    )

            # In-transit with risk assessment
            if status == "in_transit":
                results["at_risk_shipments"].append({
                    "shipment_id": shipment_id,
                    "sku": row.get("sku", ""),
                    "carrier": row.get("carrier", ""),
                    "status": "monitoring",
                })

            # Lost shipments — critical escalation
            if status == "lost":
                results["lost_shipments"].append({
                    "shipment_id": shipment_id,
                    "sku": row.get("sku", ""),
                    "carrier": row.get("carrier", ""),
                    "severity": "CRITICAL",
                })
                results["warnings"].append(f"CRITICAL: Shipment {shipment_id} marked as LOST")

        # Summary
        results["summary"] = {
            "total_shipments": len(shipment_df),
            "delayed_count": len(results["delayed_shipments"]),
            "in_transit_count": status_counts.get("in_transit", 0),
            "delivered_count": status_counts.get("delivered", 0),
            "lost_count": len(results["lost_shipments"]),
            "on_time_rate": round(
                status_counts.get("delivered", 0) / max(len(shipment_df), 1), 2
            ),
        }

        return results

    async def _synthesize_with_llm(self, query: str, analysis: dict, rag_context: dict) -> dict:
        """LLM synthesis of shipment analysis."""
        try:
            llm = self.get_llm()

            context_text = ""
            if rag_context.get("has_context"):
                context_text = f"\n\nDocument context:\n{rag_context['context']}"

            prompt = f"""You are a helpful supply chain analyst. Answer the user's question using the shipment data below.

Write a clear, conversational response. Use **bold** for important values. Use bullet points for lists. Do NOT use section headers like "REASONING:" or "RECOMMENDATION:" — just write naturally.

USER QUESTION: {query}

SHIPMENT STATUS: {analysis['status_breakdown']}
Delayed shipments: {analysis['delayed_shipments'][:5]}
Lost shipments: {analysis['lost_shipments']}
In-transit (monitored): {len(analysis['at_risk_shipments'])}
Summary: {analysis['summary']}
{context_text}

End with a confidence score on its own line, like: Confidence: 0.85
Be specific — cite shipment IDs, delays, and recommended actions."""

            response = llm.invoke(prompt)
            text = response.content.strip()

            confidence = 0.75
            import re
            conf_match = re.search(r'[Cc]onfidence[:\s]+(\d+\.?\d*)', text)
            if conf_match:
                try:
                    confidence = float(conf_match.group(1))
                    if confidence > 1:
                        confidence = confidence / 100
                except (ValueError, IndexError):
                    pass
                text = re.sub(r'\n*[Cc]onfidence[:\s]+\d+\.?\d*[^\n]*', '', text).strip()

            return {"reasoning": text, "recommendation": "", "confidence": min(confidence, 1.0)}

        except Exception as e:
            self.logger.error(f"LLM synthesis failed: {str(e)}")
            s = analysis["summary"]
            return {
                "reasoning": f"Found **{s['delayed_count']}** delayed and **{s['lost_count']}** lost shipments out of **{s['total_shipments']}** total. Review delayed items and escalate critical ones to carriers.",
                "recommendation": "",
                "confidence": 0.6,
            }
