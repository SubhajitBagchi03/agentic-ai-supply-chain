"""
Document upload endpoint for RAG pipeline.
POST /documents/upload
"""

import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from utils.errors import FileUploadError
from utils.logger import api_logger
from config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

# Allowed file extensions
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".doc", ".docx"}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form("general"),
    supplier_name: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
):
    """
    Upload a document to the RAG knowledge base.
    
    Supports: PDF, TXT, MD files.
    Metadata is processed per DOCUMENT_METADATA_SCHEMA.md.
    """
    # Validate extension
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {list(ALLOWED_EXTENSIONS)}"
        )

    # Check file size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f}MB). Maximum: {settings.max_file_size_mb}MB"
        )

    # Generate document metadata (per DOCUMENT_METADATA_SCHEMA.md)
    document_id = f"DOC_{uuid.uuid4().hex[:8].upper()}"

    metadata = {
        "document_id": document_id,
        "file_name": file.filename,
        "document_type": document_type,
        "upload_timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "ui_upload",
        "version": "1.0",
    }

    # Add optional contextual fields
    if supplier_name:
        metadata["supplier_name"] = supplier_name
    if notes:
        metadata["notes"] = notes

    # Save file to disk
    os.makedirs(settings.document_dir, exist_ok=True)
    file_path = os.path.join(settings.document_dir, f"{document_id}_{file.filename}")

    with open(file_path, "wb") as f:
        f.write(content)

    # ── RAG Processing: ingest → chunk → embed → store ──
    chunks_added = 0
    rag_error = None
    try:
        from rag.ingestion import ingest_document
        from rag.chunking import chunk_documents
        from rag.vector_store import add_documents

        # 1. Parse the document into pages
        pages = ingest_document(file_path, metadata)

        # 2. Split pages into overlapping chunks
        chunks = chunk_documents(pages)

        # 3. Embed and store in ChromaDB
        chunks_added = add_documents(chunks)

        api_logger.info(
            f"RAG indexed: {file.filename} → {chunks_added} chunks stored",
            extra={"details": {"document_id": document_id, "chunks": chunks_added}},
        )
    except Exception as e:
        rag_error = str(e)
        api_logger.error(f"RAG processing failed for {file.filename}: {e}")

    return {
        "status": "success",
        "message": f"Document '{file.filename}' uploaded and indexed ({chunks_added} chunks)",
        "document_id": document_id,
        "metadata": metadata,
        "file_size_mb": round(size_mb, 2),
        "rag_indexed": chunks_added > 0,
        "chunks_stored": chunks_added,
        "rag_error": rag_error,
    }

