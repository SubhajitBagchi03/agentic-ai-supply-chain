# Agentic AI Supply Chain Control Tower

This is a full-stack, AI-powered control tower for supply chain management. It features a React frontend and a FastAPI backend, utilizing specialized AI agents (via LangChain and Groq) to analyze inventory, shipments, supplier risk, and documents via RAG (ChromaDB).

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
