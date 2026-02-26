"""
ChromaDB vector store operations.
Manages document storage, retrieval, and metadata filtering.
"""

from typing import List, Optional, Dict

from utils.logger import rag_logger

# Cache the embedding model (expensive to load) but NOT the Chroma instance
_embeddings = None


def _get_embeddings():
    """Get or create the embedding model (cached)."""
    global _embeddings
    if _embeddings is None:
        from rag.embeddings import get_embeddings
        _embeddings = get_embeddings()
    return _embeddings


def get_vector_store():
    """
    Get a ChromaDB vector store instance.
    
    Creates a fresh Chroma wrapper each time to ensure it reads the latest
    persisted data, but reuses the cached embedding model.
    """
    from langchain_chroma import Chroma
    from config import settings
    import os

    os.makedirs(settings.chroma_persist_dir, exist_ok=True)

    store = Chroma(
        collection_name="supply_chain_docs",
        embedding_function=_get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )

    return store


def add_documents(chunks: List[dict]) -> int:
    """
    Add document chunks to the vector store.
    
    Args:
        chunks: List of dicts with 'text' and 'metadata'
    
    Returns:
        Number of chunks added
    """
    if not chunks:
        return 0

    store = get_vector_store()

    texts = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]
    
    # Use chunk_id as the document ID for deduplication
    ids = [c["metadata"].get("chunk_id", f"chunk_{i}") for i, c in enumerate(chunks)]

    store.add_texts(texts=texts, metadatas=metadatas, ids=ids)

    rag_logger.info(f"Added {len(chunks)} chunks to vector store")
    return len(chunks)


def similarity_search(
    query: str,
    k: int = 5,
    filter_dict: Optional[Dict] = None,
    score_threshold: float = -1.0,
) -> List[dict]:
    """
    Search for similar documents in the vector store.
    
    Args:
        query: Search query text
        k: Number of results to return
        filter_dict: Optional metadata filter (e.g., {"document_type": "contract"})
        score_threshold: Minimum similarity score (Chroma scores can be negative)
    
    Returns:
        List of dicts with 'text', 'metadata', 'score'
    """
    store = get_vector_store()

    try:
        # Check if there are any documents first
        count = store._collection.count()
        if count == 0:
            rag_logger.info("No documents in vector store, skipping search")
            return []

        rag_logger.info(f"Searching {count} documents for: '{query[:50]}...'")

        if filter_dict:
            results = store.similarity_search_with_relevance_scores(
                query, k=k, filter=filter_dict
            )
        else:
            results = store.similarity_search_with_relevance_scores(query, k=k)

        # Filter by score threshold and format results
        formatted = []
        for doc, score in results:
            if score >= score_threshold:
                formatted.append({
                    "text": doc.page_content,
                    "metadata": doc.metadata,
                    "score": round(score, 4),
                })

        rag_logger.info(
            f"Similarity search: query='{query[:50]}...', "
            f"results={len(formatted)}/{len(results)}, "
            f"threshold={score_threshold}"
        )

        return formatted

    except Exception as e:
        rag_logger.error(f"Vector search error: {type(e).__name__}: {str(e)}")
        return []


def get_document_count() -> int:
    """Get total number of documents in the vector store."""
    try:
        store = get_vector_store()
        collection = store._collection
        return collection.count() if collection else 0
    except Exception:
        return 0


def delete_documents(document_id: str) -> bool:
    """
    Delete all chunks belonging to a specific document.
    
    Args:
        document_id: The document_id to delete
    
    Returns:
        True if deletion was successful
    """
    try:
        store = get_vector_store()
        store._collection.delete(where={"document_id": document_id})
        rag_logger.info(f"Deleted chunks for document: {document_id}")
        return True
    except Exception as e:
        rag_logger.error(f"Failed to delete document {document_id}: {str(e)}")
        return False
