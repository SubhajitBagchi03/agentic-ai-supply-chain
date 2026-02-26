# Data Flow — Agentic AI Supply Chain Control Tower

## Overview

This document describes how data moves through the system from ingestion to decision-making.

The system integrates structured datasets and unstructured documents to support multi-agent intelligence.

---

## High Level Flow

User Inputs
│
├── Inventory Upload
├── Supplier Upload
├── Shipment Upload
├── Demand Upload
└── Document Upload (RAG)
│
▼
Data Processing Layer
│
├── Validation
├── Cleaning
├── Schema Mapping
└── Metadata Extraction
│
▼
Storage Layer
│
├── Structured Data Store
└── Vector Database
│
▼
Orchestrator Engine
│
├── Inventory Agent
├── Supplier Agent
├── Shipment Agent
├── Report Agent
└── Risk Logic
│
▼
Decision Outputs
│
├── Alerts
├── Recommendations
├── Reports
└── Explanations
│
▼

## Dashboard UI

---

## Structured Data Flow

1. User uploads CSV datasets.
2. Backend validates schema.
3. Data stored in structured data layer.
4. Agents query datasets when needed.

---

## Document Data Flow

1. User uploads documents.
2. System parses text.
3. Text is chunked.
4. Embeddings generated.
5. Stored in vector database.
6. Agents query via RAG.

---

## Decision Flow Example

Low inventory detected:
Inventory Agent
↓
Check demand dataset
↓
Check supplier dataset
↓
Query documents via RAG
↓
Generate recommendation
↓
Display alert

---

## Key Design Principles

- Multi-source integration
- Agent-driven reasoning
- Explainable outputs
- Continuous monitoring

---

## Rationale

Separating data flows ensures modularity, scalability, and realistic system behavior similar to enterprise control towers.
