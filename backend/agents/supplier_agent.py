"""
Supplier Agent — evaluates, scores, and recommends suppliers.
Implements logic from PROJECT_OVERVIEW.md Section 5.2.
"""

import pandas as pd

from agents.base_agent import BaseAgent
from data.store import data_store
from utils.math_utils import compute_supplier_score


class SupplierAgent(BaseAgent):
    """
    Supplier evaluation and recommendation agent.
    
    Functions:
    - Multi-criteria supplier scoring
    - Risk evaluation
    - Contract reasoning via RAG
    - Supplier comparison and recommendation
    """

    def __init__(self):
        super().__init__("Supplier Agent")

    async def analyze(self, query: str, **kwargs) -> dict:
        """Run supplier analysis based on the query."""
        self.log_analysis_start(query)

        if not data_store.has_data("supplier"):
            return self.log_no_data("supplier")

        supplier_df = data_store.get_supplier()
        analysis = self._run_full_analysis(supplier_df)

        # Get RAG context (contracts, supplier docs)
        rag_context = self.get_rag_context(query, document_type="contract")

        # LLM synthesis
        llm_response = await self._synthesize_with_llm(query, analysis, rag_context)

        return self.format_response(
            reasoning=llm_response.get("reasoning", ""),
            recommendation=llm_response.get("recommendation", ""),
            confidence=llm_response.get("confidence", 0.7),
            data_sources=["supplier_dataset"] + (
                rag_context.get("sources", []) if rag_context.get("has_context") else []
            ),
            warnings=analysis.get("warnings", []),
            extra=analysis,
        )

    def _run_full_analysis(self, supplier_df: pd.DataFrame) -> dict:
        """Run supplier scoring and ranking."""
        results = {
            "scored_suppliers": [],
            "top_supplier": None,
            "risk_flagged": [],
            "warnings": [],
            "summary": {},
        }

        for _, row in supplier_df.iterrows():
            supplier_id = row["supplier_id"]
            name = row["name"]

            # Compute composite score
            score = compute_supplier_score(
                cost_index=float(row.get("cost_index", 50)),
                on_time_rate=float(row.get("on_time_rate", 0)),
                lead_time=float(row.get("lead_time", 30)),
                quality_score=float(row.get("quality_score", 0)),
            )

            scored = {
                "supplier_id": supplier_id,
                "name": name,
                "composite_score": score,
                "cost_index": float(row.get("cost_index", 0)),
                "on_time_rate": float(row.get("on_time_rate", 0)),
                "lead_time": float(row.get("lead_time", 0)),
                "quality_score": float(row.get("quality_score", 0)),
                "risk_score": float(row.get("risk_score", 0)),
            }
            results["scored_suppliers"].append(scored)

            # Flag high-risk suppliers
            risk_score = float(row.get("risk_score", 0))
            if risk_score > 0.5:
                results["risk_flagged"].append({
                    "supplier_id": supplier_id,
                    "name": name,
                    "risk_score": risk_score,
                    "message": f"High risk supplier: {name} (risk={risk_score})",
                })
                results["warnings"].append(f"High risk: {name} (risk_score={risk_score})")

            # Check for missing metrics
            for metric in ["cost_index", "on_time_rate", "quality_score"]:
                val = row.get(metric)
                if pd.isna(val) or val is None:
                    results["warnings"].append(f"Missing {metric} for {name}")

        # Sort by composite score (highest = best)
        results["scored_suppliers"].sort(key=lambda x: x["composite_score"], reverse=True)

        # Top supplier (tie-breaking: lowest risk)
        if results["scored_suppliers"]:
            top = results["scored_suppliers"][0]
            # Check for ties
            ties = [
                s for s in results["scored_suppliers"]
                if abs(s["composite_score"] - top["composite_score"]) < 0.5
            ]
            if len(ties) > 1:
                # Break tie by lowest risk score
                ties.sort(key=lambda x: x["risk_score"])
                results["top_supplier"] = ties[0]
                results["warnings"].append(
                    f"Tie in scoring between {[t['name'] for t in ties]}. "
                    f"Selected {ties[0]['name']} (lowest risk)."
                )
            else:
                results["top_supplier"] = top

        # Summary
        results["summary"] = {
            "total_suppliers": len(supplier_df),
            "high_risk_count": len(results["risk_flagged"]),
            "top_supplier": results["top_supplier"]["name"] if results["top_supplier"] else "None",
            "avg_score": round(
                sum(s["composite_score"] for s in results["scored_suppliers"]) / max(len(results["scored_suppliers"]), 1), 2
            ),
        }

        return results

    async def _synthesize_with_llm(self, query: str, analysis: dict, rag_context: dict) -> dict:
        """LLM synthesis of supplier analysis."""
        try:
            llm = self.get_llm()

            context_text = ""
            if rag_context.get("has_context"):
                context_text = f"\n\nContract/document context:\n{rag_context['context']}"

            top_5 = analysis["scored_suppliers"][:5]
            prompt = f"""You are a helpful supply chain analyst. Answer the user's question using the supplier data below.

Write a clear, conversational response. Use **bold** for important values. Use bullet points for lists. Do NOT use section headers like "REASONING:" or "RECOMMENDATION:" — just write naturally.

USER QUESTION: {query}

SUPPLIER RANKINGS (by composite score):
{chr(10).join(f"  {i+1}. {s['name']} — Score: {s['composite_score']}, Cost: {s['cost_index']}, "
              f"On-time: {s['on_time_rate']:.0%}, Lead: {s['lead_time']}d, "
              f"Quality: {s['quality_score']:.0%}, Risk: {s['risk_score']:.0%}"
              for i, s in enumerate(top_5))}

Scoring weights: Cost 30%, Reliability 35%, Speed 20%, Quality 15%
Top recommended: {analysis['top_supplier']['name'] if analysis['top_supplier'] else 'N/A'}
Risk-flagged: {[r['name'] for r in analysis['risk_flagged']]}
{context_text}

End with a confidence score on its own line, like: Confidence: 0.85
Be specific — cite supplier names, scores, and risk factors."""

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
            top = analysis.get("top_supplier", {})
            return {
                "reasoning": f"Top supplier: **{top.get('name', 'N/A')}** with composite score **{top.get('composite_score', 0)}**. Review flagged risks before finalizing.",
                "recommendation": "",
                "confidence": 0.65,
            }

