"""
Intent detection module.
Classifies user queries into agent categories using LLM + keyword fallback.
"""

from typing import List

from utils.logger import orchestrator_logger


# Keyword-based intent hints (fallback if LLM fails)
INTENT_KEYWORDS = {
    "inventory": [
        "stock", "inventory", "reorder", "safety stock", "sku", "warehouse",
        "on hand", "stockout", "low stock", "restock", "replenish",
    ],
    "supplier": [
        "supplier", "vendor", "procurement", "cost", "quality score",
        "reliability", "contract", "sourcing", "bid",
    ],
    "shipment": [
        "shipment", "delivery", "tracking", "carrier", "delay", "ship",
        "transit", "logistics", "freight", "route", "eta",
    ],
    "report": [
        "report", "summary", "kpi", "dashboard", "trend", "overview",
        "brief", "executive", "performance", "metrics",
    ],
    "risk": [
        "risk", "warning", "alert", "danger", "threat", "forecast",
        "predict", "vulnerability", "exposure",
    ],
    "document": [
        "document", "contract", "clause", "agreement", "note",
        "report file", "uploaded doc", "pdf",
    ],
}


def detect_intent_keywords(query: str) -> List[str]:
    """
    Fallback keyword-based intent detection.
    
    Returns list of detected intent categories.
    """
    query_lower = query.lower()
    detected = []

    for intent, keywords in INTENT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in query_lower:
                if intent not in detected:
                    detected.append(intent)
                break

    return detected if detected else ["report"]  # Default to report agent


async def detect_intent_llm(query: str) -> List[str]:
    """
    LLM-based intent classification using Groq.
    
    Returns list of detected intent categories.
    """
    try:
        from langchain_groq import ChatGroq
        from config import settings

        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name=settings.groq_model,
            temperature=0.0,
        )

        prompt = f"""Classify the following supply chain query into one or more categories.

CATEGORIES:
- inventory: Questions about stock levels, reorders, safety stock, SKU management
- supplier: Questions about supplier evaluation, scoring, contracts, procurement
- shipment: Questions about shipment tracking, delays, delivery, logistics
- report: Requests for summaries, KPIs, dashboards, executive briefs
- risk: Questions about risks, warnings, forecasts, vulnerability assessment
- document: Questions about uploaded documents, contracts, specific document content

QUERY: {query}

Respond with ONLY a comma-separated list of matching categories. Example: inventory,risk
If multiple categories apply, list all of them."""

        response = llm.invoke(prompt)
        text = response.content.strip().lower()

        # Parse the response
        valid_intents = {"inventory", "supplier", "shipment", "report", "risk", "document"}
        detected = [
            intent.strip()
            for intent in text.split(",")
            if intent.strip() in valid_intents
        ]

        if not detected:
            # Fallback to keyword detection
            orchestrator_logger.warning("LLM intent detection returned no valid intents, using keyword fallback")
            detected = detect_intent_keywords(query)

        orchestrator_logger.info(
            f"Intent detected: {detected}",
            extra={"query": query[:80], "details": {"intents": detected}}
        )

        return detected

    except Exception as e:
        orchestrator_logger.error(f"LLM intent detection failed: {str(e)}, using keyword fallback")
        return detect_intent_keywords(query)


async def detect_intent(query: str) -> List[str]:
    """
    Main intent detection entry point.
    Tries LLM first, falls back to keyword matching.
    """
    return await detect_intent_llm(query)
