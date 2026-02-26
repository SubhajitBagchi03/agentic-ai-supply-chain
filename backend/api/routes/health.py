"""
Health check endpoint.
GET /health
"""

import os
from fastapi import APIRouter

from data.store import data_store
from data.schemas import HealthResponse
from utils.logger import api_logger

router = APIRouter(tags=["Health"])

# Cache groq status so we don't call it on every health check
_groq_status_cache = {"ok": None, "checked": False}


def _check_groq_fast() -> bool:
    """Fast Groq check — validates key format and does a quick ping (cached)."""
    global _groq_status_cache

    # If already checked and succeeded, return cached result
    if _groq_status_cache["checked"] and _groq_status_cache["ok"]:
        return True

    try:
        from config import settings

        key = settings.groq_api_key or ""

        # Fast key format validation — Groq keys start with gsk_
        if not key or not key.startswith("gsk_") or len(key) < 20:
            api_logger.warning("Groq API key missing or invalid format")
            _groq_status_cache = {"ok": False, "checked": True}
            return False

        # Try a real but lightweight API call
        from langchain_groq import ChatGroq
        llm = ChatGroq(
            api_key=key,
            model_name=settings.groq_model,
            max_tokens=5,
            timeout=8,
        )
        llm.invoke("hi")
        _groq_status_cache = {"ok": True, "checked": True}
        api_logger.info("Groq API health check: connected")
        return True

    except Exception as e:
        api_logger.warning(f"Groq health check failed: {e}")
        _groq_status_cache = {"ok": False, "checked": True}
        return False


def _get_doc_count() -> int:
    """Get document count without re-initialising the vector store."""
    try:
        from rag.vector_store import get_vector_store
        vs = get_vector_store()
        if vs and hasattr(vs, "_collection") and vs._collection:
            return vs._collection.count()
    except Exception:
        pass
    return 0


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Fast system health check.
    Returns dataset status, document count, and Groq connection status.
    """
    datasets = data_store.get_status()

    # Run Groq check (cached after first success)
    groq_ok = _check_groq_fast()

    # Document count (non-blocking)
    doc_count = _get_doc_count()

    return HealthResponse(
        status="healthy",
        datasets_loaded=datasets,
        documents_indexed=doc_count,
        groq_connected=groq_ok,
    )
