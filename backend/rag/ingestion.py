"""
Document ingestion module for the RAG pipeline.
Parses PDFs and text files, extracts text with page-level metadata.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import List

from utils.errors import IngestionError
from utils.logger import rag_logger


def parse_pdf(file_path: str) -> List[dict]:
    """
    Extract text from a PDF file page by page.
    
    Returns:
        List of dicts with 'text', 'page_number', 'metadata'
    """
    try:
        import pdfplumber

        pages = []
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({
                        "text": text.strip(),
                        "page_number": i,
                    })

        if not pages:
            rag_logger.warning(f"No text extracted from PDF: {file_path}")

        return pages

    except Exception as e:
        raise IngestionError(
            f"Failed to parse PDF: {str(e)}",
            file_name=os.path.basename(file_path)
        )


def parse_text_file(file_path: str) -> List[dict]:
    """
    Read a plain text file.
    
    Returns:
        List with single dict containing full text
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            rag_logger.warning(f"Empty text file: {file_path}")
            return []

        return [{
            "text": text.strip(),
            "page_number": 1,
        }]

    except UnicodeDecodeError:
        # Fallback encoding
        with open(file_path, "r", encoding="latin-1") as f:
            text = f.read()
        return [{
            "text": text.strip(),
            "page_number": 1,
        }]
    except Exception as e:
        raise IngestionError(
            f"Failed to read text file: {str(e)}",
            file_name=os.path.basename(file_path)
        )


def ingest_document(file_path: str, metadata: dict) -> List[dict]:
    """
    Full ingestion pipeline for a single document.
    
    Args:
        file_path: Path to the uploaded file
        metadata: Document metadata (from DOCUMENT_METADATA_SCHEMA.md)
    
    Returns:
        List of page-level document dicts ready for chunking
    """
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    rag_logger.info(f"Ingesting document: {file_path} (type: {ext})")

    if ext == ".pdf":
        pages = parse_pdf(file_path)
    elif ext in (".txt", ".md"):
        pages = parse_text_file(file_path)
    else:
        raise IngestionError(
            f"Unsupported file format: {ext}",
            file_name=os.path.basename(file_path)
        )

    # Attach metadata to each page
    enriched_pages = []
    for page in pages:
        page_meta = {
            **metadata,
            "page_number": page["page_number"],
        }
        enriched_pages.append({
            "text": page["text"],
            "metadata": page_meta,
        })

    rag_logger.info(
        f"Ingestion complete: {len(enriched_pages)} pages extracted",
        extra={"details": {"document_id": metadata.get("document_id"), "pages": len(enriched_pages)}}
    )

    return enriched_pages
