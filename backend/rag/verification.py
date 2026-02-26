"""
RAG verification and grounding layer.
Implements faithfulness checking, citation enforcement, and hallucination prevention.
As per RAG_ARCHITECTURE.md and PROJECT_OVERVIEW.md Section 7.
"""

from typing import Optional

from utils.logger import rag_logger


async def verify_faithfulness(
    answer: str,
    context: str,
    query: str,
) -> dict:
    """
    Verify that the generated answer is grounded in the retrieved context.
    
    Uses a second LLM call to score faithfulness (per PROJECT_OVERVIEW.md:
    "Second LLM verifies: Does answer exist in context? Return score.").
    
    Returns:
        Dict with 'is_faithful', 'score', 'explanation'
    """
    if not context:
        return {
            "is_faithful": False,
            "score": 0.0,
            "explanation": "No context available for verification"
        }

    try:
        from langchain_groq import ChatGroq
        from config import settings

        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name=settings.groq_model,
            temperature=0.0,
        )

        verification_prompt = f"""You are a faithfulness verification system. Your task is to determine whether the given answer is fully supported by the provided context.

CONTEXT:
{context}

QUESTION:
{query}

ANSWER TO VERIFY:
{answer}

Evaluate the answer and respond in this exact format:
SCORE: [0.0 to 1.0]
FAITHFUL: [YES or NO]
EXPLANATION: [Brief explanation of your assessment]

Rules:
- Score 1.0 if every claim in the answer is directly supported by the context
- Score 0.0 if the answer contains claims not found in the context
- Score between 0.0 and 1.0 for partial support
- If the answer says "I don't have enough information" or similar, score 1.0 (honest response)
"""

        response = llm.invoke(verification_prompt)
        response_text = response.content

        # Parse the verification response
        score = 0.5
        is_faithful = True
        explanation = "Verification completed"

        for line in response_text.strip().split("\n"):
            line = line.strip()
            if line.startswith("SCORE:"):
                try:
                    score = float(line.replace("SCORE:", "").strip())
                    score = max(0.0, min(1.0, score))
                except ValueError:
                    pass
            elif line.startswith("FAITHFUL:"):
                is_faithful = "YES" in line.upper()
            elif line.startswith("EXPLANATION:"):
                explanation = line.replace("EXPLANATION:", "").strip()

        rag_logger.info(
            f"Faithfulness check: score={score}, faithful={is_faithful}",
            extra={"details": {"score": score, "faithful": is_faithful}}
        )

        return {
            "is_faithful": is_faithful,
            "score": round(score, 2),
            "explanation": explanation,
        }

    except Exception as e:
        rag_logger.error(f"Faithfulness verification failed: {str(e)}")
        return {
            "is_faithful": True,  # Fail open — don't block on verification failure
            "score": 0.5,
            "explanation": f"Verification system error: {str(e)}"
        }


def enforce_citations(answer: str, sources: list) -> str:
    """
    Ensure the answer includes source citations.
    
    Per PROJECT_OVERVIEW.md: "All answers must include citations."
    
    Args:
        answer: The generated answer text
        sources: List of source metadata dicts
    
    Returns:
        Answer with appended citation block
    """
    if not sources:
        return answer + "\n\n⚠️ Note: No document sources were used for this response."

    citation_block = "\n\n📄 **Sources:**\n"
    for i, source in enumerate(sources, 1):
        doc_name = source.get("file_name", "Unknown")
        page = source.get("page_number", "?")
        doc_type = source.get("document_type", "document")
        score = source.get("relevance_score", 0)

        citation_block += f"  {i}. {doc_name} (p.{page}, {doc_type}) — relevance: {score:.0%}\n"

    return answer + citation_block


def apply_hallucination_guard(
    answer: str,
    faithfulness_score: float,
    threshold: float = 0.4,
) -> str:
    """
    Replace answer if faithfulness score is below threshold.
    
    Per PROJECT_OVERVIEW.md: If unsupported →
    "I cannot find this information in the available documents."
    """
    if faithfulness_score < threshold:
        rag_logger.warning(
            f"Hallucination guard triggered: score={faithfulness_score} < threshold={threshold}"
        )
        return (
            "I cannot find sufficient evidence in the available documents to answer "
            "this question reliably. Please upload relevant documents or rephrase your query."
        )

    return answer
