"""
Embedding generation module.
Uses HuggingFace sentence-transformers for local embedding (no API key needed).
"""

from typing import List

from utils.logger import rag_logger

# Singleton embedding model instance
_embeddings_instance = None


def get_embeddings():
    """
    Get or create the HuggingFace embeddings instance (singleton).
    
    Uses the model specified in config (default: all-MiniLM-L6-v2).
    First call will download the model (~80MB).
    """
    global _embeddings_instance

    if _embeddings_instance is None:
        from langchain_huggingface import HuggingFaceEmbeddings
        from config import settings

        rag_logger.info(f"Loading embedding model: {settings.embedding_model}")

        _embeddings_instance = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

        rag_logger.info("Embedding model loaded successfully")

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
