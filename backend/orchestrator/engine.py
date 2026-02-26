"""
Orchestrator engine — the central query processing pipeline.
Receives queries → detects intent → routes to agents → assembles response.
"""

import time
from typing import Optional

from orchestrator.intent import detect_intent
from orchestrator.router import get_agents_for_intents
from rag.retrieval import retrieve_context
from rag.verification import verify_faithfulness, enforce_citations, apply_hallucination_guard
from utils.logger import orchestrator_logger
from utils.errors import OrchestrationError


async def orchestrate_query(
    query: str,
    context_filter: Optional[dict] = None,
) -> dict:
    """
    Main orchestration pipeline.
    
    Flow:
    1. Detect intent(s) from query
    2. Route to appropriate agent(s)
    3. Execute agents sequentially (per spec: multiple intents → sequential)
    4. Assemble responses
    5. Verify faithfulness (for RAG-backed answers)
    6. Return structured response
    
    Args:
        query: Natural language query
        context_filter: Optional metadata filters for RAG retrieval
    
    Returns:
        Structured QueryResponse dict
    """
    start_time = time.time()
    orchestrator_logger.info(f"Orchestrating query: {query[:100]}")

    try:
        # Step 1: Detect intent
        intents = await detect_intent(query)
        orchestrator_logger.info(f"Detected intents: {intents}")

        # Step 2: Route to agents
        agents = get_agents_for_intents(intents)
        orchestrator_logger.info(f"Routing to {len(agents)} agent(s)")

        # Step 3: Execute agents sequentially
        agent_responses = []
        all_warnings = []

        for agent in agents:
            try:
                response = await agent.analyze(query)
                agent_responses.append(response)

                # Collect warnings
                if response.get("warnings"):
                    all_warnings.extend(response["warnings"])

            except Exception as e:
                orchestrator_logger.error(
                    f"Agent {agent.name} failed: {str(e)}",
                    extra={"agent": agent.name}
                )
                # Continue with other agents (graceful degradation)
                agent_responses.append({
                    "agent": agent.name,
                    "reasoning": f"Agent encountered an error: {str(e)}",
                    "recommendation": "Please try again or rephrase your query.",
                    "confidence": 0.0,
                    "data_sources": [],
                    "warnings": [f"Agent error: {str(e)}"],
                })

        # Step 4: Compute metadata
        elapsed_ms = round((time.time() - start_time) * 1000)
        avg_confidence = (
            sum(r.get("confidence", 0) for r in agent_responses) / max(len(agent_responses), 1)
        )

        # Step 5: Assemble response
        result = {
            "query": query,
            "intents_detected": intents,
            "responses": agent_responses,
            "metadata": {
                "agents_used": [a.name for a in agents],
                "total_agents": len(agents),
                "avg_confidence": round(avg_confidence, 2),
                "processing_time_ms": elapsed_ms,
                "warnings": all_warnings[:10],  # Cap warnings
            },
        }

        orchestrator_logger.info(
            f"Query processed in {elapsed_ms}ms, {len(agents)} agents, "
            f"avg confidence: {avg_confidence:.2f}",
            extra={"latency_ms": elapsed_ms}
        )

        return result

    except Exception as e:
        elapsed_ms = round((time.time() - start_time) * 1000)
        orchestrator_logger.error(f"Orchestration failed: {str(e)}", exc_info=True)
        raise OrchestrationError(
            f"Failed to process query: {str(e)}",
            details={"query": query[:200], "elapsed_ms": elapsed_ms}
        )
