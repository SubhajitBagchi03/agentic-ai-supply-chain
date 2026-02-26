"""
Query endpoint — routes natural language queries to the orchestrator.
POST /query
"""

from fastapi import APIRouter, HTTPException

from data.schemas import QueryRequest, QueryResponse
from utils.errors import OrchestrationError, AppError
from utils.logger import api_logger

router = APIRouter(tags=["Query"])


@router.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """
    Process a natural language supply chain query.
    
    The orchestrator detects intent, routes to appropriate agent(s),
    and assembles the response with reasoning and confidence scores.
    """
    try:
        from orchestrator.engine import orchestrate_query

        api_logger.info(
            f"Query received: {request.query[:100]}",
            extra={"query": request.query}
        )

        result = await orchestrate_query(
            query=request.query,
            context_filter=request.context_filter,
        )

        return result

    except OrchestrationError as e:
        raise HTTPException(status_code=500, detail={
            "error": e.message,
            "error_code": e.error_code,
        })
    except AppError as e:
        raise HTTPException(status_code=500, detail={
            "error": e.message,
            "error_code": e.error_code,
            "details": e.details,
        })
    except Exception as e:
        api_logger.error(f"Unexpected query error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={
            "error": "An unexpected error occurred while processing your query",
            "error_code": "INTERNAL_ERROR",
        })
