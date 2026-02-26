"""
RAG retrieval layer.
Handles query → embedding → search → context assembly.
"""

from typing import List, Optional, Dict

from rag.vector_store import similarity_search
from utils.errors import RetrievalError
from utils.logger import rag_logger


def retrieve_context(
    query: str,
    k: int = 5,
    filter_dict: Optional[Dict] = None,
    min_results: int = 1,
) -> dict:
    """
    Retrieve relevant context for a query from the vector store.
    
    Args:
        query: Natural language query
        k: Number of chunks to retrieve
        filter_dict: Optional metadata filters
        min_results: Minimum results required (else raises error)
    
    Returns:
        Dict with 'context' (assembled text), 'sources' (metadata list),
        'chunks' (raw results), 'has_context' (bool)
    """
    rag_logger.info(f"Retrieving context for: '{query[:80]}...'")

    # Perform similarity search
    results = similarity_search(
        query=query,
        k=k,
        filter_dict=filter_dict,
    )

    if not results:
        rag_logger.warning(f"No relevant context found for query: '{query[:80]}...'")
        return {
            "context": "",
            "sources": [],
            "chunks": [],
            "has_context": False,
            "message": "Insufficient context in available documents."
        }

    # Assemble context from retrieved chunks (deduplicated)
    context_parts = []
    sources = []
    seen_texts = set()

    for i, result in enumerate(results):
        # Deduplicate: skip chunks with identical text
        text_key = result["text"].strip()[:200]
        if text_key in seen_texts:
            continue
        seen_texts.add(text_key)

        meta = result["metadata"]

        # Build source citation
        source_ref = {
            "document_id": meta.get("document_id", "unknown"),
            "file_name": meta.get("file_name", "unknown"),
            "page_number": meta.get("page_number"),
            "section_title": meta.get("section_title"),
            "document_type": meta.get("document_type"),
            "relevance_score": result["score"],
        }
        sources.append(source_ref)

        # Add raw text without citation markers (less noise for LLM)
        context_parts.append(result["text"])

    assembled_context = "\n\n".join(context_parts)

    rag_logger.info(
        f"Context assembled: {len(context_parts)} unique chunks from {len(results)} results, "
        f"avg score: {sum(r['score'] for r in results) / len(results):.3f}"
    )

    return {
        "context": assembled_context,
        "sources": sources,
        "chunks": results,
        "has_context": True,
        "message": f"Retrieved {len(context_parts)} relevant document chunks"
    }


def retrieve_for_agent(
    query: str,
    document_type: Optional[str] = None,
    supplier_name: Optional[str] = None,
    k: int = 5,
) -> dict:
    """
    Convenience method for agents to retrieve context with common filters.
    
    Used by agents that need document context (e.g., Supplier Agent
    querying contract docs).
    """
    filter_dict = {}
    if document_type:
        filter_dict["document_type"] = document_type
    if supplier_name:
        filter_dict["supplier_name"] = supplier_name

    return retrieve_context(
        query=query,
        k=k,
        filter_dict=filter_dict if filter_dict else None,
    )
