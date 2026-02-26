"""
Text chunking engine for the RAG pipeline.
Splits document pages into overlapping chunks for embedding.
"""

import uuid
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from utils.logger import rag_logger


# Default chunking parameters (per RAG_ARCHITECTURE.md: 500-1000 tokens)
DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 200


def create_text_splitter(
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> RecursiveCharacterTextSplitter:
    """
    Create a text splitter instance.
    
    Uses RecursiveCharacterTextSplitter for intelligent splitting
    that preserves sentence and paragraph boundaries.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
        is_separator_regex=False,
    )


def chunk_documents(
    pages: List[dict],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[dict]:
    """
    Split document pages into overlapping chunks.
    
    Args:
        pages: List of dicts with 'text' and 'metadata' from ingestion
        chunk_size: Target chunk size in characters
        chunk_overlap: Overlap between chunks in characters
    
    Returns:
        List of chunk dicts with 'text', 'metadata' (including chunk_id)
    """
    splitter = create_text_splitter(chunk_size, chunk_overlap)
    chunks = []

    for page in pages:
        text = page["text"]
        base_metadata = page.get("metadata", {})

        # Split the page text
        text_chunks = splitter.split_text(text)

        for i, chunk_text in enumerate(text_chunks):
            chunk_id = f"CHUNK_{uuid.uuid4().hex[:8].upper()}"

            chunk_metadata = {
                **base_metadata,
                "chunk_id": chunk_id,
                "chunk_index": i,
                "total_chunks_in_page": len(text_chunks),
                "chunk_size": len(chunk_text),
            }

            chunks.append({
                "text": chunk_text,
                "metadata": chunk_metadata,
            })

    rag_logger.info(
        f"Chunking complete: {len(pages)} pages → {len(chunks)} chunks "
        f"(size={chunk_size}, overlap={chunk_overlap})"
    )

    return chunks
