# Agentic AI Supply Chain Control Tower

This is a full-stack, AI-powered control tower for supply chain management. It features a React frontend and a FastAPI backend, utilizing specialized AI agents (via LangChain and Groq) to analyze inventory, shipments, supplier risk, and documents via RAG (ChromaDB).

### Key Features

- **Live Visual Dashboard:** Real-time KPIs (Fill Rate, Delay Rates) and dynamic charts (Recharts) for inventory health and supplier comparison.
- **AI Query Engine:** Natural language conversational interface to ask questions about your operations.
- **SKU Decisions Page:** Single-item deep dives bringing together stock levels, shipment status, and a multi-agent AI risk analysis.
- **PDF Report Generation:** One-click enterprise report exporting with agentic confidence scoring.

## Architecture

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Python + FastAPI
- **AI/LLM:** LangChain + Groq API
- **Vector DB:** ChromaDB
- **Data Integrations:** Google Sheets + CSV Uploads

## Prerequisites

- Node.js (v18+)
- Python (3.12+)
- A [Groq API Key](https://console.groq.com/keys)

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
CHROMA_PERSIST_DIR=storage/chroma_db
UPLOAD_DIR=storage/uploads
DOCUMENT_DIR=storage/documents
MAX_FILE_SIZE_MB=50
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Deployment (Render)

This monorepo is configured for easy deployment on [Render](https://render.com/).

### Backend (Web Service)

1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. **Root Directory:** `backend`
4. **Environment:** `Python 3`
5. **Build Command:** `pip install -r requirements.txt`
6. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. **Environment Variables:**
   - `GROQ_API_KEY`: (Your Key)
   - `FRONTEND_URL`: (Your Render Static Site URL, e.g., `https://my-frontend.onrender.com`)

_Note: On Render's free tier, storage is ephemeral. Uploaded CSVs and ChromaDB vector embeddings will reset when the server restarts._

### Frontend (Static Site)

1. Create a new **Static Site** on Render.
2. Connect your GitHub repository.
3. **Root Directory:** `frontend`
4. **Build Command:** `npm install && npm run build`
5. **Publish Directory:** `dist`
6. **Environment Variables:**
   - `VITE_API_URL`: (Your Render Web Service URL, e.g., `https://my-backend.onrender.com`)
