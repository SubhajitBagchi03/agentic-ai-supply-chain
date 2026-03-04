# SYSTEM GOAL

Build an enterprise-grade AI Supply Chain Control Tower that:

- Ingests supply chain documents via a unified RAG pipeline
- Reads structured operational datasets (Inventory, Supplier, Shipment, Demand)
- Performs deterministic and probabilistic decision analysis
- Runs multi-agent workflows
- Provides explainable recommendations
- Detects risks proactively
- Handles data anomalies and operational uncertainty
- Supports human-in-the-loop decision making

The system must behave as:
A virtual supply chain intelligence assistant — not a chatbot.

## HIGH LEVEL ARCHITECTURE

Frontend (Dashboard)react using jsx  
↓  
API Gateway (FastAPI)  
↓  
Orchestrator Service  
↓  
Agents Layer  
├ Inventory Agent  
├ Supplier Agent  
├ Shipment Agent  
├ Report Agent  
└ Risk Logic Module  
↓  
RAG Service + Vector DB(Chroma DB)  
↓  
Structured Data Layer (CSV + Pandas / DB / Sheets)  
↓  
Storage (Docs, Logs, Metrics)

## DATA INPUT MODEL

### Structured Inputs (Separate UI sections)

Upload Inventory Dataset  
Upload Supplier Dataset  
Upload Shipment Dataset  
Upload Demand Dataset

Each feeds a dedicated agent.

### Unstructured Input

Single upload:  
Upload Documents

Supports:

- Contracts
- Reports
- Emails
- Delivery notes

Processed via RAG pipeline.

## CORE SERVICES

### API SERVICE — FastAPI

**Responsibilities:**

- Dataset upload handling
- Document ingestion
- Query processing
- Agent orchestration
- Health monitoring

**Endpoints:**

- POST /inventory/upload
- POST /supplier/upload
- POST /shipment/upload
- POST /demand/upload
- POST /documents/upload
- POST /query
- GET /health

### 3.2 ORCHESTRATOR

**Responsibilities:**

- Intent detection
- Agent routing
- Multi-agent coordination
- Conflict resolution
- Response assembly

**Logic:**  
if query mentions stock → inventory agent  
if supplier decision → supplier agent  
if shipment tracking → shipment agent  
if summary/report → report agent

**Edge case:**  
Multiple intents → sequential execution.

### 3.3 RAG SERVICE

**Pipeline:**  
Parse → Chunk → Embed → Store → Retrieve → Ground → Verify

Must include:

- Chunk overlap
- Metadata tagging required
- Retrieval filters
- Faithfulness scoring

**Failure mode:**  
If retrieval empty → respond “insufficient context”.

## DATA MODELS

### Inventory Item

sku  
name  
warehouse  
on_hand  
safety_stock  
lead_time_days  
avg_daily_demand  
supplier_id  
last_updated

**Edge cases:**

- Negative stock
- Missing demand
- Lead time zero
- Duplicate SKU

**Handling:**  
if demand missing → estimate rolling average  
if negative stock → flag anomaly

### Supplier

supplier_id  
name  
cost_index  
lead_time  
on_time_rate  
quality_score  
risk_score

### Shipment

shipment_id  
sku  
origin  
destination  
status  
planned_date  
actual_date  
delay_days  
carrier

## AGENT SPECIFICATIONS

### 5.1 INVENTORY AGENT

**Functions:**

- Detect low stock
- Compute reorder
- Predict stockout
- Demand anomaly detection
- Suggest transfer

**Formula:**  
reorder_qty =
(avg_daily_demand × lead_time)

- safety_stock

* on_hand
  **Edge cases:**

| Case               | Handling         |
| ------------------ | ---------------- |
| demand spike       | apply multiplier |
| stock zero         | critical alert   |
| unrealistic demand | cap threshold    |
| stale data         | warn             |
| warehouse mismatch | log error        |

**Anomaly detection:**  
if demand > 5× rolling average → anomaly

### 5.2 SUPPLIER AGENT

**Scoring:**  
score = 0.3 cost +  
0.35 reliability +  
0.2 speed +  
0.15 quality

**Edge cases:**

- Supplier missing metrics
- Tie scores
- High cost but urgent order
- Conflicting contract clauses

Multi-criteria supplier scoring  
Risk evaluation  
Contract reasoning via RAG

**Fallback:**  
Choose lowest risk supplier.

### 5.3 SHIPMENT AGENT

**Tasks:**

- Detect delay risk
- Predict arrival
- Shipment monitoring
- Escalation alerts
- Suggest reroute

**Prediction:**  
delay = carrier_avg_delay + weather_factor

- congestion_factor

**Edge cases:**

- Shipment lost
- Duplicate tracking ID
- Carrier API down
- Partial shipment

**Actions:**  
Escalate severity.

### 5.4 REPORT AGENT

**Generates:**

- KPIs
- Trends
- Risk summary
- Cross-agent insights
- Executive brief

**Edge cases:**

- Missing metrics
- Inconsistent time windows
- Outlier values

Must sanitize output.

### 5.5 Risk Logic Module

**Computes:**

- Stockout risk probability
- Delay risk indicators
- Supplier instability signals

## ADVANCED MATHEMATICS

1. Reorder Point Formula
   ROP=μ_d×L+Z×σ_d×√L

Where:
μ_d = average demand
σ_d = demand volatility
L = lead time
Z = service level factor
Purpose:
Accounts for uncertainty.

---

2. Supplier Scoring (Multi-Objective Optimization)
   Score=w_1 Cost+w_2 Reliability+w_3 LeadTime+w_4 Quality

Weights normalized.

---

3. Risk Score Model
   Risk=P(Event)×Impact

Where probability estimated via historical patterns.

---

4. Delay Prediction Heuristic
   Delay=BaseDelay+WeatherFactor+CongestionFactor

---

5. Demand Volatility Index
   Volatility=σ/μ

Detects instability

## EDGE CASE EXPANSION (ADVANCED)

**Data anomalies**

- Negative inventory
- Missing supplier mapping
- Duplicate SKUs
- Extreme outliers
- Sudden demand spikes

**Operational failures**

- Supplier bankruptcy scenario
- Shipment lost
- Partial delivery mismatch
- Contract violation detection

**System failures**

- RAG retrieval empty
- CSV schema drift
- Encoding corruption
- Memory pressure

**Mathematical edge cases**

- Division by zero in volatility
- Infinite reorder quantity
- Missing variance
- Negative lead time

**Logical edge cases**

- Conflicting supplier recommendations
- Multiple simultaneous risks
- Cascading failures

## RAG SAFETY MECHANISMS

- Grounding verification
- Citation enforcement
- Context relevance scoring
- Hallucination prevention

**Faithfulness Check**  
Second LLM verifies:  
Does answer exist in context? Return score.

**Citation Enforcement**  
All answers must include:

**Hallucination Guard**  
If unsupported:  
"I cannot find this information."

## ERROR HANDLING STRATEGY

**Categories**  
**User errors**

- Bad file
- Invalid CSV
- Missing fields

**System errors**

- Vector DB unavailable
- LLM timeout
- Disk full

**Data errors**

**Recovery**

| Error       | Action             |
| ----------- | ------------------ |
| LLM timeout | retry              |
| DB down     | degrade mode       |
| bad CSV     | return schema hint |

## SECURITY

Must include:

- File size limits
- Input sanitization
- File type validation
- Path sanitization
- Upload limits
- Safe parsing
- API keys protection
- Rate limiting
- Data isolation

**Future:**

- RBAC
- Encryption at rest
- Audit logs

## PERFORMANCE

**Targets:**

| Metric        | Goal   |
| ------------- | ------ |
| Query latency | <3s    |
| Upload        | <10s   |
| RAG retrieval | <500ms |

**Optimizations:**

## OBSERVABILITY

**Logs:**

- Agent decisions
- Inputs
- Errors
- Latency
- Risk signals

**Metrics:**

- Queries per minute
- Faithfulness score
- Error rate

**Tracing:**  
Track request across agents.

## DATA STORAGE MODEL

**Structured data:**  
CSV + Pandas

**Knowledge storage:**  
ChromaDB

## LIVE DATA HANDLING

**Support:**

- Google Sheets
- CSV refresh
- API feeds

**Polling strategy:** every 60 seconds

**Edge cases:**

## UI BEHAVIOR

**Dashboard must show:**

- Real-time calculated KPIs (Fill Rate, Days of Supply)
- Visual data charts (Inventory vs Safety Stock, Risk Distributions)
- Live active alerts

**Decisions Page must show:**

- Cross-referenced single SKU status
- AI Multi-Agent reasoning chain with markdown formatting
- State persistence during navigation

**Reports must support:**

- AI agent consensus and formatting
- Downloadable artifacts (PDF export)

**UX rules:**

- Fast feedback loops and loading states when agents are "thinking"
- Graceful degradation if backend is unavailable

## TESTING

**Unit**  
Formulas correct.

**Integration**  
Agents interact correctly.

**Chaos**  
Simulate failures.

**Data fuzzing**  
Random CSV inputs.

**RAG tests**  
Grounding accuracy.

## SCALABILITY

**Design for:**

- Multi-tenant
- Thousands of documents
- Parallel agents

**Use:**

## EDGE CASE MASTER LIST

Include handling for:

- Duplicate documents
- Empty PDFs
- OCR errors
- Conflicting contract info
- Supplier bankruptcy scenario
- Inventory mismatch

## NON FUNCTIONAL REQUIREMENTS

## SUCCESS CRITERIA

System must:  
✅ Produce grounded answers  
✅ Make consistent decisions  
✅ Survive bad input  
✅ Recover from failures  
✅ Explain reasoning  
✅ Handle real workflows

## Full Tech Stack for the Project

### AI / Agent Layer (Core Intelligence)

- LangChain → Agent tools, RAG pipelines, orchestration
- LangGraph → Multi-agent workflows, state management
- OpenAI API (or Gemini / LLaMA API) → LLM reasoning & explanations
- Sentence Transformers / OpenAI Embeddings → Document embeddings

**Why:** Enables agentic workflows + grounded reasoning.

### RAG Infrastructure

- ChromaDB (recommended for FYP) → Vector database  
  (Alternative: FAISS)
- Unstructured / PyPDF / pdfplumber → Document parsing
- tiktoken / text splitter utilities → Chunking

**Why:** Makes documents searchable and usable by agents.

### Backend

- FastAPI → API server (lightweight, async, perfect for AI apps)
- Python → Main language
- Pydantic → Data validation
- Uvicorn / Gunicorn → Server runtime

**Why:** Clean architecture + fast development.

### Data Layer (Operational Data)

**For demo:**  
CSV files + Pandas

**For “live data”:**  
Google Sheets API

**Why:** Flexible and realistic.

### Frontend

React (JavaScript)

### Monitoring

Logging

### Integration & Automation

- Requests / HTTPX → External API calls
- APScheduler / Celery → Scheduled agent runs
- Webhooks → Event triggers

**Why:** Enables automation.

### Observability

Python logging

**Why:** Track system behavior.

### Security

- API Keys
- JWT (optional)
- python-multipart → Safe file uploads
- Input sanitization

**Why:** Protect data.

### Reporting

- ReportLab / WeasyPrint → PDF generation
- Matplotlib / Plotly → Charts
- Pandas exports → CSV reports

**Why:** Executive reporting.

### Testing

Pytest

## Stack by System Layer (Quick Summary Table)

| Layer      | Tools                |
| ---------- | -------------------- |
| Agents     | LangChain, LangGraph |
| LLM        | OpenAI / Gemini      |
| RAG        | ChromaDB             |
| Backend    | FastAPI              |
| Data       | Pandas, CSV, Sheets  |
| Frontend   | React(jsx)           |
| Reports    | ReportLab            |
| Testing    | Pytest               |
| Monitoring | Logging              |
