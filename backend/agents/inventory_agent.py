"""
Inventory Agent — monitors stock levels, detects anomalies, computes reorders.
Implements logic from PROJECT_OVERVIEW.md Section 5.1.
"""

import pandas as pd

from agents.base_agent import BaseAgent
from data.store import data_store
from utils.math_utils import (
    compute_reorder_point,
    compute_reorder_quantity,
    compute_days_until_stockout,
    compute_stockout_probability,
    compute_demand_volatility,
    detect_demand_anomaly,
    compute_classic_eoq,
    compute_z_score_safety_stock,
)


class InventoryAgent(BaseAgent):
    """
    Inventory management agent.
    
    Functions:
    - Detect low stock
    - Compute reorder quantities
    - Predict stockout
    - Demand anomaly detection
    - Suggest transfers
    """

    def __init__(self):
        super().__init__("Inventory Agent")

    async def analyze(self, query: str, **kwargs) -> dict:
        """Run inventory analysis based on the query."""
        self.log_analysis_start(query)

        # Check if data is available
        if not data_store.has_data("inventory"):
            return self.log_no_data("inventory")

        inventory_df = data_store.get_inventory()
        demand_df = data_store.get_demand() if data_store.has_data("demand") else None

        # Run comprehensive analysis
        analysis = self._run_full_analysis(inventory_df, demand_df)

        # Get RAG context if relevant
        rag_context = self.get_rag_context(query)

        # Use LLM to synthesize findings with the query
        llm_response = await self._synthesize_with_llm(
            query=query,
            analysis=analysis,
            rag_context=rag_context,
        )

        return self.format_response(
            reasoning=llm_response.get("reasoning", ""),
            recommendation=llm_response.get("recommendation", ""),
            confidence=llm_response.get("confidence", 0.7),
            data_sources=["inventory_dataset"] + (
                rag_context.get("sources", []) if rag_context.get("has_context") else []
            ),
            warnings=analysis.get("warnings", []),
            extra=analysis,
        )

    def _run_full_analysis(self, inventory_df: pd.DataFrame, demand_df: pd.DataFrame = None) -> dict:
        """Run all inventory analysis computations."""
        results = {
            "low_stock_items": [],
            "critical_items": [],
            "reorder_recommendations": [],
            "anomalies": [],
            "warnings": [],
            "summary": {},
        }

        for _, row in inventory_df.iterrows():
            sku = row["sku"]
            on_hand = float(row["on_hand"])
            safety_stock = float(row["safety_stock"])
            lead_time = float(row["lead_time_days"])
            avg_demand = float(row["avg_daily_demand"])

            # --- Low stock detection ---
            if on_hand < safety_stock:
                item_info = {
                    "sku": sku,
                    "name": row.get("name", ""),
                    "warehouse": row.get("warehouse", ""),
                    "on_hand": on_hand,
                    "safety_stock": safety_stock,
                    "deficit": round(safety_stock - on_hand, 2),
                }
                results["low_stock_items"].append(item_info)

                # Critical: zero or negative stock
                if on_hand <= 0:
                    results["critical_items"].append({
                        **item_info,
                        "severity": "CRITICAL",
                        "message": f"Stock is {'negative' if on_hand < 0 else 'zero'} for {sku}",
                    })
                    results["warnings"].append(
                        f"CRITICAL: {'Negative' if on_hand < 0 else 'Zero'} stock for {sku}"
                    )

            # --- Reorder computation & Advanced Math ---
            reorder_qty = compute_reorder_quantity(avg_demand, lead_time, safety_stock, on_hand)
            
            annual_demand = avg_demand * 365
            eoq = compute_classic_eoq(annual_demand, order_cost=50.0, holding_cost_per_unit=2.5) # Assumptions for S and H
            optimal_safety_stock = compute_z_score_safety_stock(lead_time, demand_std_dev=avg_demand * 0.2) # Assuming 20% volatility
            
            if reorder_qty > 0:
                results["reorder_recommendations"].append({
                    "sku": sku,
                    "name": row.get("name", ""),
                    "reorder_quantity": reorder_qty,
                    "economic_order_quantity_eoq": eoq,
                    "calculated_ideal_safety_stock": optimal_safety_stock,
                    "supplier_id": row.get("supplier_id", ""),
                    "days_until_stockout": compute_days_until_stockout(on_hand, avg_demand),
                    "stockout_probability": compute_stockout_probability(
                        on_hand, avg_demand, lead_time
                    ),
                })

            # --- Demand anomaly detection (if demand data available) ---
            if demand_df is not None and not demand_df.empty:
                sku_demand = demand_df[demand_df["sku"] == sku]
                if not sku_demand.empty:
                    demand_values = sku_demand["quantity"].tolist()
                    if len(demand_values) > 1:
                        latest = demand_values[-1]
                        historical = demand_values[:-1]
                        anomaly = detect_demand_anomaly(latest, historical)
                        if anomaly["is_anomaly"]:
                            results["anomalies"].append({
                                "sku": sku,
                                "type": "demand_spike",
                                **anomaly,
                            })
                            results["warnings"].append(
                                f"Demand anomaly for {sku}: {anomaly['ratio']}× normal"
                            )

        # Summary stats
        results["summary"] = {
            "total_items": len(inventory_df),
            "low_stock_count": len(results["low_stock_items"]),
            "critical_count": len(results["critical_items"]),
            "items_needing_reorder": len(results["reorder_recommendations"]),
            "anomalies_detected": len(results["anomalies"]),
        }

        return results

    async def _synthesize_with_llm(self, query: str, analysis: dict, rag_context: dict) -> dict:
        """Use LLM to synthesize analysis findings into a natural language response."""
        try:
            llm = self.get_llm()

            context_text = ""
            if rag_context.get("has_context"):
                context_text = f"\n\nRelevant document context:\n{rag_context['context']}"

            prompt = f"""You are a helpful supply chain analyst. Answer the user's question using the data below.

Write a clear, conversational response. Use **bold** for important values. Use bullet points for lists. Do NOT use section headers like "REASONING:" or "RECOMMENDATION:" or "CONFIDENCE:" — just write naturally.

Structure your answer as:
- First, explain what you found in the data
- Then, give specific actionable recommendations with quantities and SKU names
- End with a confidence score on its own line, like: Confidence: 0.85

USER QUESTION: {query}

DATA SUMMARY:
- {analysis['summary']['total_items']} total items in inventory
- {analysis['summary']['low_stock_count']} items below safety stock
- {analysis['summary']['critical_count']} critical (zero/negative stock)
- {analysis['summary']['items_needing_reorder']} items needing reorder

Low stock: {analysis['low_stock_items'][:5]}
Reorder needs: {analysis['reorder_recommendations'][:5]}
Critical: {analysis['critical_items'][:5]}
Anomalies: {analysis['anomalies'][:3]}
{context_text}

Be specific — cite SKU IDs, quantities, and supplier IDs. Keep it concise."""

            response = llm.invoke(prompt)
            text = response.content.strip()

            # Extract confidence if present at end
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
                # Remove the confidence line from display text
                text = re.sub(r'\n*[Cc]onfidence[:\s]+\d+\.?\d*[^\n]*', '', text).strip()

            return {
                "reasoning": text,
                "recommendation": "",
                "confidence": min(confidence, 1.0),
            }

        except Exception as e:
            self.logger.error(f"LLM synthesis failed: {str(e)}")
            summary = analysis["summary"]
            return {
                "reasoning": (
                    f"Found **{summary['low_stock_count']}** items below safety stock, "
                    f"**{summary['critical_count']}** critical items at zero stock, and "
                    f"**{summary['items_needing_reorder']}** items needing reorder. "
                    f"Review the flagged items and process reorder recommendations."
                ),
                "recommendation": "",
                "confidence": 0.65,
            }
