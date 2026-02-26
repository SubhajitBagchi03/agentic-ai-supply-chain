"""
Agent routing module.
Maps detected intents to agent instances.
"""

from typing import List

from agents.inventory_agent import InventoryAgent
from agents.supplier_agent import SupplierAgent
from agents.shipment_agent import ShipmentAgent
from agents.report_agent import ReportAgent
from agents.risk_logic import RiskLogicModule
from agents.base_agent import BaseAgent

from utils.logger import orchestrator_logger


# Agent registry — maps intent category to agent class
AGENT_REGISTRY = {
    "inventory": InventoryAgent,
    "supplier": SupplierAgent,
    "shipment": ShipmentAgent,
    "report": ReportAgent,
    "risk": RiskLogicModule,
    "document": ReportAgent,  # Document queries handled by report agent with RAG
}


def get_agents_for_intents(intents: List[str]) -> List[BaseAgent]:
    """
    Instantiate agents for the detected intents.
    
    Args:
        intents: List of intent categories
    
    Returns:
        List of agent instances (deduplicated)
    """
    seen = set()
    agents = []

    for intent in intents:
        agent_class = AGENT_REGISTRY.get(intent)
        if agent_class and agent_class.__name__ not in seen:
            agents.append(agent_class())
            seen.add(agent_class.__name__)
            orchestrator_logger.info(f"Routed intent '{intent}' → {agent_class.__name__}")
        elif not agent_class:
            orchestrator_logger.warning(f"No agent found for intent: {intent}")

    if not agents:
        # Default to report agent
        orchestrator_logger.warning("No agents matched, defaulting to ReportAgent")
        agents.append(ReportAgent())

    return agents
