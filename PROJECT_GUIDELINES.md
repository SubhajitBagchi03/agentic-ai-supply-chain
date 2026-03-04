# Project Development Guidelines — Agentic AI Supply Chain Control Tower

## Purpose

This document defines development standards, architectural rules, and workflows to ensure the system remains consistent, maintainable, and aligned with real-world supply chain modeling practices.

The project is designed as a multi-agent decision support platform that integrates structured datasets and unstructured documents to provide operational intelligence.

---

## Technology Stack

### Backend

- Python
- FastAPI
- LangChain
- LangGraph
- ChromaDB
- Pandas

### Frontend

- React (JavaScript)
- CSS or Tailwind (optional)

### Infrastructure

- Local development environment
- REST APIs
- Logging system

---

## Core Development Principles

### Modular Architecture

Each component must be independently testable and replaceable. Avoid tightly coupled logic.

---

### Separation of Concerns

Clearly separate:

- API layer
- Agent logic
- Data processing
- RAG pipeline
- UI components

---

### Readability First

Write clear, understandable code. Avoid unnecessary complexity.

---

### Safety and Explainability

Operational recommendations must be transparent and explainable.

---

## Multi-Dataset Architecture Guidelines

The system operates using multiple structured datasets representing different operational domains. These datasets must remain logically separated.

### Dataset Separation Principle

Each dataset feeds a specific agent:

- Inventory dataset → Inventory Agent
- Supplier dataset → Supplier Agent
- Shipment dataset → Shipment Agent
- Demand/Sales dataset → Inventory Agent and Risk logic

Do not merge datasets into a single schema.

---

### Rationale

Maintaining separation:

- Mirrors real enterprise systems
- Prevents schema conflicts
- Improves maintainability
- Enables modular reasoning
- Supports future scalability

---

## UI Upload Structure

The frontend must provide dedicated upload sections.

Required sections:

- Upload Inventory Data
- Upload Supplier Data
- Upload Shipment Data
- Upload Demand/Sales Data
- Upload Documents (RAG Knowledge Base)

Each upload workflow should:

- Validate schema
- Confirm ingestion
- Display dataset status

---

## Document Ingestion (RAG) Guidelines

All unstructured documents must be handled through a single unified upload interface.

### Supported Document Types

- Supplier contracts
- Delivery notes
- Purchase orders
- Shipment reports
- Emails
- Performance reports

---

### Single Upload Principle

Use one "Upload Documents" section. Do not create separate upload forms per document type.

---

### Metadata Requirements

Each document should store metadata:

- Document type
- Source context
- Supplier reference (if applicable)
- Upload timestamp

Metadata improves retrieval accuracy.

---

### RAG Processing Flow

Documents must pass through:

1. Parsing
2. Text extraction
3. Chunking
4. Embedding generation
5. Storage in vector database
6. Retrieval during queries

---

### Agent Access

All agents may query the document knowledge base when context is needed.

Examples:

- Contract clauses
- Delivery history
- Supplier notes

---

## Agent Data Ownership

Agents must access only relevant datasets.

Examples:

- Inventory Agent → inventory + demand
- Supplier Agent → supplier data + documents
- Shipment Agent → shipment data
- Report Agent → aggregated data

Avoid unnecessary cross-dependencies.

---

## Code Standards

- Use descriptive variable names
- Write docstrings
- Keep functions focused
- Avoid duplication
- Maintain consistent formatting

---

## Version Control Workflow

Suggested branches:

- main — stable releases
- dev — integration
- feature/\* — new features
- fix/\* — bug fixes

Use pull requests before merging.

---

## Commit Message Convention

Examples:

- feat: add supplier scoring logic
- fix: handle missing shipment field
- docs: update architecture notes
- refactor: improve agent orchestration

---

## Testing Expectations

Testing must include:

- Unit tests for formulas
- Integration tests for agent workflows
- RAG grounding validation
- Edge case testing

---

## Error Handling Policy

Errors must:

- Be logged
- Provide actionable messages
- Avoid silent failures
- Preserve system stability

---

## Data Management Practices

- Validate all uploads
- Handle missing values gracefully
- Maintain consistent schemas
- Track updates

---

## Security Practices

- Sanitize inputs
- Restrict file uploads
- Protect API endpoints
- Avoid hardcoded secrets
- Use environment variables

---

## Documentation Requirements

When adding features:

- Update relevant documentation
- Explain behavior changes
- Describe edge cases

Architecture updates must be recorded.

---

## UI Guidelines

React frontend should:

- Provide clear feedback
- Show loading states
- Preserve user state (`sessionStorage`) to survive page navigation
- Display alerts prominently
- Explain recommendations
- Support exporting artifacts (e.g., PDF)

Avoid cluttered interfaces.

---

## Observability Expectations

The system must expose:

- Logs
- Health checks
- Error tracking

Operational visibility is essential.

---

## Performance Considerations

Optimize for:

- Responsive UI
- Efficient data processing
- Minimal blocking operations
- Stable behavior under load

---

## Review Checklist

Before merging:

- Code runs locally
- Tests pass
- No breaking changes
- Documentation updated
- Logs reviewed

---

## Long-Term Maintainability

Design for:

- Extensibility
- Scalability
- Agent evolution
- Additional datasets
- Future automation

Avoid quick fixes.

---

## Project Philosophy

Build as if the system may eventually support real operational decisions.

Prioritize clarity, reliability, and responsible design.
