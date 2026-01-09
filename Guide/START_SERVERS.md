# How to Run Frontend and Backend & Verify RAG Implementation

## Prerequisites

1. **Python Virtual Environment** - Already created at `react-fuid-system/venv`
2. **Node.js and npm** - For running the React frontend
3. **Ollama** - Must be running for RAG embeddings and generation
4. **PostgreSQL** (optional) - For database features

## Step 1: Start Ollama (REQUIRED for RAG)

Before starting the backend, make sure Ollama is running:

```bash
# Check if Ollama is installed
ollama --version

# Start Ollama server (if not running)
ollama serve

# Pull required models (in a new terminal)
ollama pull mxbai-embed-large  # For embeddings
ollama pull llama3.2:3b        # For text generation
```

**Verify Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

## Step 2: Start the Backend

### Option A: Using PowerShell (Windows)

```powershell
# Navigate to the project directory
cd "D:\Downloads\Unique-id\Unique-id\react-fuid-system"

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Navigate to backend directory
cd backend

# Set environment variables (optional)
$env:PORT = "5002"
$env:OLLAMA_URL = "http://localhost:11434"
$env:EMBED_MODEL_NAME = "mxbai-embed-large"
$env:LLM_MODEL_NAME = "llama3.2:3b"

# Start the Flask server
python server.py
```

### Option B: Using Command Prompt (Windows)

```cmd
cd D:\Downloads\Unique-id\Unique-id\react-fuid-system
venv\Scripts\activate
cd backend
python server.py
```

### Option C: Using Git Bash/WSL

```bash
cd "/d/Downloads/Unique-id/Unique-id/react-fuid-system"
source venv/Scripts/activate  # or venv/bin/activate on WSL
cd backend
python server.py
```

**Expected Backend Output:**
```
Starting FUID Management System Backend...
Data file: D:\Downloads\Unique-id\Unique-id\react-fuid-system\company_data.json
Loading product data for Chroma pre-ingestion (10 products)...
Selected 10 products for embedding
Product FUID-XXX: Split into X chunks
Pre-ingested X chunks across 10 products into ChromaDB
 * Running on http://0.0.0.0:5002
```

## Step 3: Start the Frontend

**Open a NEW terminal window** (keep backend running)

### Option A: Using PowerShell/Command Prompt

```powershell
# Navigate to the frontend directory
cd "D:\Downloads\Unique-id\Unique-id\react-fuid-system"

# Install dependencies (first time only)
npm install

# Start the React development server
npm start
```

### Option B: Using Git Bash/WSL

```bash
cd "/d/Downloads/Unique-id/Unique-id/react-fuid-system"
npm install  # First time only
npm start
```

**Expected Frontend Output:**
```
Compiled successfully!

You can now view fuid-management-system in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

## Step 4: Access the Application

1. **Frontend UI:** http://localhost:3000
2. **Backend API:** http://localhost:5002/api
3. **Health Check:** http://localhost:5002/api/health

## Step 5: Verify RAG Implementation

### A. Check RAG Status via API

```bash
# Check RAG system status
curl http://localhost:5002/api/rag/status
```

**Expected Response:**
```json
{
  "success": true,
  "embeddings_ready": true,
  "total_products": 10,
  "dynamic_mode": false,
  "models_loaded": {
    "embedding_model": true,
    "llm": true
  },
  "product_ids": ["FUID-XXX", "FUID-YYY", ...]
}
```

### B. Test RAG Chat via API

```bash
# Test RAG chat endpoint
curl -X POST http://localhost:5002/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the key features of this product?",
    "product_fuid": "FUID-GOOGL:00712-2745-00"
  }'
```

### C. Verify via Frontend UI

1. **Open** http://localhost:3000
2. **Navigate to Search Page**
3. **Search for a product** that has embeddings (one of the 10 processed products)
4. **Click "Ask AI" button** on a product card
5. **Ask a question** like:
   - "What are the key features?"
   - "Tell me about this product"
   - "What is the long description?"

### D. Check Backend Logs

Look for these log messages in the backend terminal:

```
✅ Good signs:
- "Selected 10 products for embedding"
- "Pre-ingested X chunks across 10 products into ChromaDB"
- "Retrieving context for product FUID-XXX"
- "Retrieved 3 relevant chunks for product FUID-XXX"

⚠️ Warning signs:
- "No products with long descriptions found"
- "Failed to get query embedding"
- "No chunks found for product"
```

### E. Verify ChromaDB Database

The embeddings are stored in:
```
react-fuid-system/backend/rag_embeddings_db/
```

You can check if this directory exists and contains:
- `chroma.sqlite3` - SQLite database with embeddings
- Subdirectories with embedding data

## Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'rag_manager'`
```bash
# Make sure you're in the backend directory
cd backend
python server.py
```

**Problem:** `Connection refused` when calling Ollama
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

**Problem:** `No products with long descriptions found`
- Check if `company_data.json` exists in `react-fuid-system/`
- Verify the file has products with `longDescription` field
- Check file permissions

**Problem:** Embeddings not being created
- Verify Ollama is running: `ollama serve`
- Check model is pulled: `ollama list` should show `mxbai-embed-large`
- Check backend logs for embedding errors

### Frontend Issues

**Problem:** Frontend can't connect to backend
- Verify backend is running on port 5002
- Check `package.json` proxy setting: `"proxy": "http://localhost:5002"`
- Check browser console for CORS errors

**Problem:** "Ask AI" button doesn't work
- Check browser console for errors
- Verify backend RAG endpoints are responding
- Check network tab for failed API calls

### RAG Issues

**Problem:** Empty responses from chat
- Verify products have `longDescription` in `company_data.json`
- Check if product FUID matches one of the 10 processed products
- Verify ChromaDB collection has data
- Check backend logs for retrieval errors

**Problem:** Wrong context retrieved
- Verify chunks are created correctly (check logs for chunk counts)
- Check if embeddings are generated (backend logs)
- Try restarting backend to rebuild embeddings
