"""
Structured logging for the Supply Chain Control Tower.
All agent decisions, queries, errors, and latency are logged here.
"""

import logging
import sys
import json
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """JSON log formatter for structured logging output."""

    def format(self, record):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add extra fields if present
        if hasattr(record, "agent"):
            log_entry["agent"] = record.agent
        if hasattr(record, "query"):
            log_entry["query"] = record.query
        if hasattr(record, "latency_ms"):
            log_entry["latency_ms"] = record.latency_ms
        if hasattr(record, "error_code"):
            log_entry["error_code"] = record.error_code
        if hasattr(record, "details"):
            log_entry["details"] = record.details

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = str(record.exc_info[1])

        return json.dumps(log_entry, default=str)


def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """
    Create a structured logger instance.
    
    Args:
        name: Logger name (typically module or agent name)
        level: Logging level string
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)

    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    return logger


def get_logger(name: str) -> logging.Logger:
    """Get or create a logger with the given name."""
    return setup_logger(name)


# Pre-configured loggers for common modules
api_logger = get_logger("api")
agent_logger = get_logger("agents")
rag_logger = get_logger("rag")
orchestrator_logger = get_logger("orchestrator")
data_logger = get_logger("data")
