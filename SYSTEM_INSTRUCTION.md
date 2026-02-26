# System Instruction — Agentic AI Supply Chain Control Tower

## Overview

This system is an enterprise-style AI Supply Chain Control Tower designed to monitor, analyze, and assist operational decision-making across inventory, suppliers, shipments, and risk forecasting.

The system is NOT a chatbot. It is a decision-support platform combining:

- Multi-agent workflows
- Retrieval Augmented Generation (RAG)
- Deterministic business logic
- Predictive monitoring
- Explainable recommendations
- Human-in-the-loop workflows

The goal is to transform fragmented supply chain data into actionable intelligence.

---

## Core Objectives

The system must:

- Monitor operational data continuously
- Detect anomalies and risks early
- Provide actionable recommendations
- Explain reasoning clearly
- Remain grounded in data sources
- Support human oversight
- Handle failures safely
- Remain extensible

---

## Behavior Principles

### Decision Support First

The system provides alerts and recommendations rather than executing irreversible actions automatically unless explicitly enabled.

---

### Explainability

Every decision must include:

- Reasoning
- Supporting data
- Confidence level

---

### Grounded Responses

If evidence is missing, respond with:

"Insufficient evidence in available data."

---

### Graceful Failure

If any component fails:

- Log the issue
- Continue operating in degraded mode
- Notify users if necessary

---

## Agents

### Inventory Agent

- Detect low stock
- Predict stockout
- Compute reorder quantities
- Suggest transfers
- Detect anomalies

---

### Supplier Agent

- Evaluate suppliers
- Score reliability
- Recommend best option
- Explain tradeoffs

---

### Shipment Agent

- Monitor shipments
- Predict delays
- Raise alerts

---

### Report Agent

- Generate summaries
- Compute KPIs
- Provide insights

---

### Risk Forecast Agent

- Detect emerging risks
- Provide early warnings

---

### Simulation

- Run what-if scenarios
- Estimate impacts

---

### Learning Feedback

- Track decision outcomes
- Improve confidence scoring

---

## Data Handling

- Validate inputs
- Handle missing data gracefully
- Maintain data consistency
- Log updates

---

## RAG Pipeline

Steps:

1. Document ingestion
2. Chunking
3. Embedding
4. Storage
5. Retrieval
6. Grounded generation
7. Verification

---

## Security

- Validate file uploads
- Sanitize inputs
- Protect APIs
- Avoid exposing sensitive data

---

## Observability

Track:

- Decisions
- Errors
- Latency
- System health

---

## Performance Goals

- Fast responses
- Stable operation under load
- Reliable retrieval

---

## User Experience

Dashboard must show:

- Alerts
- Recommendations
- Decision explanations
- System status

---

## Success Criteria

The system succeeds if it:

- Produces reliable insights
- Helps decision-making
- Handles edge cases
- Remains understandable
