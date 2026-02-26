"""
Report Agent — generates KPIs, trends, and executive summaries.
Implements logic from PROJECT_OVERVIEW.md Section 5.4.
"""

from agents.base_agent import BaseAgent
from data.store import data_store


class ReportAgent(BaseAgent):
    """
    Report generation agent.
    
    Functions:
    - Compute KPIs
    - Generate trends
    - Risk summary
    - Cross-agent insights
    - Executive brief
    """

    def __init__(self):
        super().__init__("Report Agent")

    async def analyze(self, query: str, **kwargs) -> dict:
        """Generate reports based on available data."""
        self.log_analysis_start(query)

        # Gather data from all datasets
        kpis = self._compute_kpis()
        has_csv_data = any(kpis.get("data_available", {}).values())

        # Always check RAG context — documents may be available even without CSV data
        rag_context = self.get_rag_context(query)

        if not has_csv_data and not rag_context.get("has_context"):
            return self.format_response(
                reasoning="No datasets or documents have been uploaded yet.",
                recommendation="Upload inventory, supplier, shipment, demand data or documents to get started.",
                confidence=0.0,
                warnings=["No data available for reporting"],
            )

        llm_response = await self._generate_report(query, kpis, rag_context)

        data_sources = list(kpis.get("data_available", {}).keys())
        if rag_context.get("has_context"):
            data_sources += rag_context.get("sources", [])

        return self.format_response(
            reasoning=llm_response.get("reasoning", ""),
            recommendation=llm_response.get("recommendation", ""),
            confidence=llm_response.get("confidence", 0.7),
            data_sources=data_sources,
            extra=kpis,
        )

    def _compute_kpis(self) -> dict:
        """Compute KPIs across all available datasets."""
        kpis = {
            "data_available": {},
            "inventory_kpis": {},
            "supplier_kpis": {},
            "shipment_kpis": {},
            "demand_kpis": {},
        }

        # Inventory KPIs
        if data_store.has_data("inventory"):
            df = data_store.get_inventory()
            kpis["data_available"]["inventory"] = True
            kpis["inventory_kpis"] = {
                "total_skus": len(df),
                "total_stock_value": float(df["on_hand"].sum()),
                "low_stock_items": int((df["on_hand"] < df["safety_stock"]).sum()),
                "zero_stock_items": int((df["on_hand"] <= 0).sum()),
                "avg_lead_time": round(float(df["lead_time_days"].mean()), 1),
                "stock_health_pct": round(
                    float((df["on_hand"] >= df["safety_stock"]).sum() / max(len(df), 1) * 100), 1
                ),
            }

        # Supplier KPIs
        if data_store.has_data("supplier"):
            df = data_store.get_supplier()
            kpis["data_available"]["supplier"] = True
            kpis["supplier_kpis"] = {
                "total_suppliers": len(df),
                "avg_on_time_rate": round(float(df["on_time_rate"].mean() * 100), 1),
                "avg_quality_score": round(float(df["quality_score"].mean() * 100), 1),
                "high_risk_suppliers": int((df["risk_score"] > 0.5).sum()),
                "avg_lead_time": round(float(df["lead_time"].mean()), 1),
            }

        # Shipment KPIs
        if data_store.has_data("shipment"):
            df = data_store.get_shipment()
            kpis["data_available"]["shipment"] = True
            delivered = df[df["status"].str.lower() == "delivered"]
            kpis["shipment_kpis"] = {
                "total_shipments": len(df),
                "delivered": int(len(delivered)),
                "in_transit": int((df["status"].str.lower() == "in_transit").sum()),
                "delayed": int((df["status"].str.lower() == "delayed").sum()),
                "lost": int((df["status"].str.lower() == "lost").sum()),
                "on_time_pct": round(
                    float(len(delivered[delivered["delay_days"] == 0]) / max(len(delivered), 1) * 100), 1
                ),
                "avg_delay_days": round(float(df["delay_days"].mean()), 1),
            }

        # Demand KPIs
        if data_store.has_data("demand"):
            df = data_store.get_demand()
            kpis["data_available"]["demand"] = True
            kpis["demand_kpis"] = {
                "total_records": len(df),
                "unique_skus": int(df["sku"].nunique()),
                "total_demand": float(df["quantity"].sum()),
                "avg_daily_demand": round(float(df["quantity"].mean()), 1),
            }

        return kpis

    async def _generate_report(self, query: str, kpis: dict, rag_context: dict) -> dict:
        """Use LLM to generate executive report."""
        try:
            llm = self.get_llm()

            has_docs = rag_context.get("has_context")
            has_csv = any(kpis.get("data_available", {}).values())

            # Build the prompt based on what data is available
            if has_docs and not has_csv:
                # Document-only query — prioritize the document content
                prompt = f"""You are a helpful supply chain analyst. The user is asking a question about an uploaded document. Read the document text below VERY CAREFULLY and answer the user's question directly from it.

IMPORTANT: The answer is IN the document text below. Read every line including headers, dates, email addresses, names, and all details. Quote specific values from the document.

USER QUESTION: {query}

=== UPLOADED DOCUMENT TEXT ===
{rag_context['context']}
=== END OF DOCUMENT ===

Answer the user's question precisely using ONLY information from the document above. Be specific — quote dates, names, email addresses, SKU numbers, and any other details that are relevant. Use **bold** for key values. Use bullet points for lists.

End with a confidence score on its own line, like: Confidence: 0.90"""

            elif has_docs and has_csv:
                # Both document + CSV data
                prompt = f"""You are a helpful supply chain analyst. Answer the user's question using BOTH the uploaded document text AND the data KPIs below.

IMPORTANT: Read the document text carefully. If the user asks about something in the document, answer from it directly. Quote specific values.

USER QUESTION: {query}

=== UPLOADED DOCUMENT TEXT ===
{rag_context['context']}
=== END OF DOCUMENT ===

KEY PERFORMANCE INDICATORS:
Inventory: {kpis.get('inventory_kpis', 'No data')}
Supplier: {kpis.get('supplier_kpis', 'No data')}
Shipment: {kpis.get('shipment_kpis', 'No data')}
Demand: {kpis.get('demand_kpis', 'No data')}

Write a clear, conversational response. Use **bold** for important values. Use bullet points for lists.
End with a confidence score on its own line, like: Confidence: 0.85"""

            else:
                # KPI-only query (no documents)
                prompt = f"""You are a helpful supply chain analyst generating an executive report. Answer the user's request using the KPIs below.

Write a clear, conversational response. Use **bold** for important values. Use bullet points for lists.

USER REQUEST: {query}

KEY PERFORMANCE INDICATORS:
Inventory: {kpis.get('inventory_kpis', 'No data')}
Supplier: {kpis.get('supplier_kpis', 'No data')}
Shipment: {kpis.get('shipment_kpis', 'No data')}
Demand: {kpis.get('demand_kpis', 'No data')}

Give a concise executive summary with insights and top 3-5 recommendations.
End with a confidence score on its own line, like: Confidence: 0.85"""

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
            self.logger.error(f"Report generation failed: {str(e)}")
            return {
                "reasoning": f"KPIs computed across **{sum(kpis['data_available'].values())}** datasets. Review the data for detailed insights.",
                "recommendation": "",
                "confidence": 0.5,
            }

