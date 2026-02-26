"""
Risk Logic Module — computes risk probabilities and signals.
Implements logic from PROJECT_OVERVIEW.md Section 5.5 and Section 6.3.
"""

import pandas as pd

from agents.base_agent import BaseAgent
from data.store import data_store
from utils.math_utils import (
    compute_risk_score,
    compute_stockout_probability,
    compute_demand_volatility,
)


class RiskLogicModule(BaseAgent):
    """
    Risk assessment module.
    
    Computes:
    - Stockout risk probability
    - Delay risk indicators
    - Supplier instability signals
    - Composite risk dashboard
    """

    def __init__(self):
        super().__init__("Risk Logic Module")

    async def analyze(self, query: str, **kwargs) -> dict:
        """Run risk analysis across all available data."""
        self.log_analysis_start(query)

        risk_analysis = self._compute_all_risks()

        if not risk_analysis.get("has_data"):
            return self.log_no_data("any")

        rag_context = self.get_rag_context(query)
        llm_response = await self._synthesize_risk(query, risk_analysis, rag_context)

        return self.format_response(
            reasoning=llm_response.get("reasoning", ""),
            recommendation=llm_response.get("recommendation", ""),
            confidence=llm_response.get("confidence", 0.7),
            data_sources=risk_analysis.get("data_sources", []),
            warnings=risk_analysis.get("warnings", []),
            extra=risk_analysis,
        )

    def _compute_all_risks(self) -> dict:
        """Compute risk signals from all available datasets."""
        results = {
            "has_data": False,
            "stockout_risks": [],
            "delay_risks": [],
            "supplier_risks": [],
            "composite_risks": [],
            "warnings": [],
            "data_sources": [],
            "risk_summary": {},
        }

        # --- Stockout Risks ---
        if data_store.has_data("inventory"):
            results["has_data"] = True
            results["data_sources"].append("inventory_dataset")
            inv_df = data_store.get_inventory()
            demand_data = {}

            if data_store.has_data("demand"):
                d_df = data_store.get_demand()
                for sku in d_df["sku"].unique():
                    demand_data[sku] = d_df[d_df["sku"] == sku]["quantity"].tolist()

            for _, row in inv_df.iterrows():
                sku = row["sku"]
                on_hand = float(row["on_hand"])
                avg_demand = float(row["avg_daily_demand"])
                lead_time = float(row["lead_time_days"])

                # Compute demand std dev from demand data if available
                std_dev = 0
                volatility = None
                if sku in demand_data and len(demand_data[sku]) >= 2:
                    volatility = compute_demand_volatility(demand_data[sku])
                    if volatility:
                        std_dev = volatility * avg_demand

                stockout_prob = compute_stockout_probability(
                    on_hand, avg_demand, lead_time, std_dev
                )

                # Impact scale: based on demand * lead_time (higher demand & longer lead = more impact)
                impact = min(10.0, (avg_demand * lead_time) / 50)
                risk = compute_risk_score(stockout_prob, impact)

                if stockout_prob > 0.2:  # Only report significant risks
                    results["stockout_risks"].append({
                        "sku": sku,
                        "name": row.get("name", ""),
                        "probability": round(stockout_prob, 3),
                        "impact": round(impact, 2),
                        "risk_score": risk,
                        "volatility": volatility,
                        "on_hand": on_hand,
                        "days_cover": round(on_hand / avg_demand, 1) if avg_demand > 0 else None,
                    })

                    if stockout_prob > 0.7:
                        results["warnings"].append(
                            f"HIGH STOCKOUT RISK: {sku} ({stockout_prob:.0%} probability)"
                        )

        # --- Supplier Instability ---
        if data_store.has_data("supplier"):
            results["has_data"] = True
            results["data_sources"].append("supplier_dataset")
            sup_df = data_store.get_supplier()

            for _, row in sup_df.iterrows():
                risk_score = float(row.get("risk_score", 0))
                on_time = float(row.get("on_time_rate", 1))

                # Supplier is risky if: high risk_score OR low on_time_rate
                instability = (risk_score * 0.6) + ((1 - on_time) * 0.4)

                if instability > 0.3:
                    results["supplier_risks"].append({
                        "supplier_id": row["supplier_id"],
                        "name": row["name"],
                        "instability_score": round(instability, 3),
                        "risk_score": risk_score,
                        "on_time_rate": on_time,
                    })

                    if instability > 0.5:
                        results["warnings"].append(
                            f"SUPPLIER INSTABILITY: {row['name']} (score={instability:.2f})"
                        )

        # --- Delay Risks ---
        if data_store.has_data("shipment"):
            results["has_data"] = True
            results["data_sources"].append("shipment_dataset")
            ship_df = data_store.get_shipment()

            delayed = ship_df[
                (ship_df["status"].str.lower().isin(["delayed", "lost"])) |
                (ship_df["delay_days"] > 0)
            ]

            for _, row in delayed.iterrows():
                delay_days = float(row.get("delay_days", 0))
                impact = min(10, delay_days / 2)
                probability = min(1.0, delay_days / 14)

                results["delay_risks"].append({
                    "shipment_id": row["shipment_id"],
                    "sku": row.get("sku", ""),
                    "delay_days": delay_days,
                    "status": row.get("status", ""),
                    "risk_score": compute_risk_score(probability, impact),
                })

        # Sort all risks by score
        results["stockout_risks"].sort(key=lambda x: x["risk_score"], reverse=True)
        results["supplier_risks"].sort(key=lambda x: x["instability_score"], reverse=True)
        results["delay_risks"].sort(key=lambda x: x["risk_score"], reverse=True)

        # Risk summary
        results["risk_summary"] = {
            "total_stockout_risks": len(results["stockout_risks"]),
            "total_supplier_risks": len(results["supplier_risks"]),
            "total_delay_risks": len(results["delay_risks"]),
            "highest_stockout": results["stockout_risks"][0] if results["stockout_risks"] else None,
            "highest_supplier_risk": results["supplier_risks"][0] if results["supplier_risks"] else None,
            "total_warnings": len(results["warnings"]),
        }

        return results

    async def _synthesize_risk(self, query: str, analysis: dict, rag_context: dict) -> dict:
        """LLM synthesis of risk analysis."""
        try:
            llm = self.get_llm()

            context_text = ""
            if rag_context.get("has_context"):
                context_text = f"\n\nDocument context:\n{rag_context['context']}"

            prompt = f"""You are a helpful supply chain analyst. Answer the user's question about risks using the data below.

Write a clear, conversational response. Use **bold** for important values. Use bullet points for lists. Do NOT use section headers like "REASONING:" or "RECOMMENDATION:" — just write naturally.

USER QUESTION: {query}

RISK DASHBOARD:
Stockout Risks: {analysis['stockout_risks'][:5]}
Supplier Instability: {analysis['supplier_risks'][:5]}
Delay Risks: {analysis['delay_risks'][:5]}
Summary: {analysis['risk_summary']}
{context_text}

End with a confidence score on its own line, like: Confidence: 0.85
Be specific — cite SKUs, supplier names, and risk scores."""

            response = llm.invoke(prompt)
            text = response.content.strip()

            confidence = 0.7
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
            self.logger.error(f"Risk synthesis failed: {str(e)}")
            s = analysis["risk_summary"]
            return {
                "reasoning": f"Found **{s['total_stockout_risks']}** stockout risks, **{s['total_supplier_risks']}** supplier risks, and **{s['total_delay_risks']}** delay risks. Review high-risk items and take preventive action.",
                "recommendation": "",
                "confidence": 0.5,
            }

