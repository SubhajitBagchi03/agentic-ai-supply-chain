"""
Abstract base agent for all supply chain agents.
Defines the standard interface and shared utilities.
"""

from abc import ABC, abstractmethod
from typing import Optional

from data.store import data_store
from rag.retrieval import retrieve_for_agent
from utils.logger import agent_logger


class BaseAgent(ABC):
    """
    Abstract base class for supply chain agents.
    
    All agents share:
    - Access to DataStore for structured data
    - Access to RAG retrieval for document context
    - Standardized response format
    - Built-in logging
    """

    def __init__(self, name: str):
        self.name = name
        self.logger = agent_logger

    @abstractmethod
    async def analyze(self, query: str, **kwargs) -> dict:
        """
        Main analysis method. Each agent implements its own logic.
        
        Args:
            query: Natural language query or analysis trigger
        
        Returns:
            Standardized response dict
        """
        pass

    def get_llm(self):
        """Get a configured LLM instance (Groq)."""
        from langchain_groq import ChatGroq
        from config import settings

        return ChatGroq(
            api_key=settings.groq_api_key,
            model_name=settings.groq_model,
            temperature=0.1,
        )

    def get_rag_context(
        self,
        query: str,
        document_type: Optional[str] = None,
        supplier_name: Optional[str] = None,
    ) -> dict:
        """Retrieve relevant document context via RAG."""
        try:
            result = retrieve_for_agent(
                query=query,
                document_type=document_type,
                supplier_name=supplier_name,
            )
            self.logger.info(
                f"RAG context for {self.name}: has_context={result.get('has_context')}, "
                f"chunks={len(result.get('chunks', []))}"
            )
            return result
        except Exception as e:
            self.logger.error(f"RAG retrieval failed in {self.name}: {type(e).__name__}: {str(e)}")
            return {"context": "", "sources": [], "chunks": [], "has_context": False}

    def format_response(
        self,
        reasoning: str,
        recommendation: str,
        confidence: float,
        data_sources: list = None,
        warnings: list = None,
        extra: dict = None,
    ) -> dict:
        """
        Format a standardized agent response.
        
        Every response includes: reasoning, recommendation, confidence,
        data sources — per SYSTEM_INSTRUCTION.md explainability requirements.
        """
        response = {
            "agent": self.name,
            "reasoning": reasoning,
            "recommendation": recommendation,
            "confidence": round(max(0.0, min(1.0, confidence)), 2),
            "data_sources": data_sources or [],
            "warnings": warnings or [],
        }

        if extra:
            response["details"] = extra

        self.logger.info(
            f"{self.name} response generated",
            extra={
                "agent": self.name,
                "details": {"confidence": response["confidence"]},
            }
        )

        return response

    def log_analysis_start(self, query: str):
        """Log the start of an analysis."""
        self.logger.info(
            f"{self.name}: Starting analysis",
            extra={"agent": self.name, "query": query[:100]}
        )

    def log_no_data(self, dataset_type: str) -> dict:
        """Return a standardized 'no data' response."""
        return self.format_response(
            reasoning=f"No {dataset_type} data has been uploaded yet.",
            recommendation=f"Please upload {dataset_type} data to enable analysis.",
            confidence=0.0,
            warnings=[f"Missing {dataset_type} dataset"],
        )
