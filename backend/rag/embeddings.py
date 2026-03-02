"""
Embedding generation module.
Uses FastEmbed (ONNX) for extremely lightweight, low-memory local embeddings.
Crucial for preventing Out-Of-Memory crashes on Render's 512MB free tier.
"""

from typing import List

from utils.logger import rag_logger

# Singleton embedding model instance
_embeddings_instance = None


def get_embeddings():
    """
    Get or create the FastEmbed embeddings instance (singleton).
    
    Uses ONNX runtime instead of PyTorch to keep RAM usage under 100MB.
    First call will download the small optimized model.
    """
    global _embeddings_instance

    if _embeddings_instance is None:
        from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

        rag_logger.info("Loading lightweight FastEmbed (ONNX) embedding model...")

        _embeddings_instance = FastEmbedEmbeddings(
            # BAAI/bge-small-en-v1.5 is default in FastEmbed, highly optimized and very small
            model_name="BAAI/bge-small-en-v1.5",
            max_length=512
        )

        rag_logger.info("FastEmbed model loaded successfully (Low RAM mode)")

    return _embeddings_instance


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts.
    
    Args:
        texts: List of text strings to embed
    
    Returns:
        List of embedding vectors
    """
    embeddings = get_embeddings()
    return embeddings.embed_documents(texts)


def embed_query(query: str) -> List[float]:
    """
    Generate embedding for a single query.
    
    Args:
        query: Query text string
    
    Returns:
        Embedding vector
    """
    embeddings = get_embeddings()
    return embeddings.embed_query(query)
