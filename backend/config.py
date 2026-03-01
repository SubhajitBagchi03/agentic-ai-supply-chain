"""
Configuration module for the Supply Chain Control Tower backend.
Loads environment variables via pydantic-settings.
"""

import os
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # --- Groq LLM ---
    groq_api_key: str = Field(..., description="Groq API key for LLM access")
    groq_model: str = Field(
        default="llama-3.3-70b-versatile",
        description="Groq model identifier"
    )

    # --- Embedding Model ---
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="HuggingFace sentence-transformer model name"
    )

    # --- ChromaDB ---
    chroma_persist_dir: str = Field(
        default="./storage/chroma_db",
        description="ChromaDB persistent storage directory"
    )

    # --- File Storage ---
    upload_dir: str = Field(
        default="./storage/uploads",
        description="Directory for uploaded CSV datasets"
    )
    document_dir: str = Field(
        default="./storage/documents",
        description="Directory for uploaded documents (PDFs, texts)"
    )

    # --- Limits ---
    max_file_size_mb: int = Field(
        default=50,
        description="Maximum file upload size in MB"
    )

    # --- Logging ---
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )

    # --- CORS / Deployment ---
    frontend_url: str = Field(
        default="http://localhost:5173",
        description="Allowed CORS origin (e.g., Render frontend URL)"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    def ensure_directories(self):
        """Create required storage directories if they don't exist."""
        for dir_path in [self.upload_dir, self.document_dir, self.chroma_persist_dir]:
            os.makedirs(dir_path, exist_ok=True)


# Singleton instance
settings = Settings()
