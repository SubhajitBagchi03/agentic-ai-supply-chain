"""
Custom exception classes for the Supply Chain Control Tower.
Provides structured error handling across all system layers.
"""


class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str, error_code: str = "INTERNAL_ERROR", details: dict = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class DataError(AppError):
    """Errors related to data validation, parsing, or processing."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(message, error_code="DATA_ERROR", details=details)


class SchemaValidationError(DataError):
    """CSV schema doesn't match expected format."""

    def __init__(self, message: str, missing_columns: list = None, extra_columns: list = None):
        details = {
            "missing_columns": missing_columns or [],
            "extra_columns": extra_columns or [],
        }
        super().__init__(message, details=details)


class DataAnomalyError(DataError):
    """Data contains anomalies (negative stock, duplicate SKUs, etc.)."""

    def __init__(self, message: str, anomalies: list = None):
        details = {"anomalies": anomalies or []}
        super().__init__(message, details=details)


class RAGError(AppError):
    """Errors in the RAG pipeline."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(message, error_code="RAG_ERROR", details=details)


class RetrievalError(RAGError):
    """Failed to retrieve relevant context from vector store."""

    def __init__(self, message: str = "Insufficient context in available documents."):
        super().__init__(message)


class IngestionError(RAGError):
    """Failed to ingest/parse a document."""

    def __init__(self, message: str, file_name: str = None):
        details = {"file_name": file_name} if file_name else {}
        super().__init__(message, details=details)


class AgentError(AppError):
    """Errors from agent processing."""

    def __init__(self, message: str, agent_name: str = None, details: dict = None):
        details = details or {}
        if agent_name:
            details["agent_name"] = agent_name
        super().__init__(message, error_code="AGENT_ERROR", details=details)


class OrchestrationError(AppError):
    """Errors in query orchestration (intent detection, routing)."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(message, error_code="ORCHESTRATION_ERROR", details=details)


class FileUploadError(AppError):
    """File upload validation failures."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(message, error_code="UPLOAD_ERROR", details=details)
