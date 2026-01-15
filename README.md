# ID Management System

A full stack web application for managing unique identifiers to host the product catalog built using React, Tailwind CSS, and Flask backend. The system includes a comprehensive RAG (Retrieval-Augmented Generation) pipeline for intelligent document querying and product information retrieval.

## Features

- **Dashboard**: Comprehensive overview with statistics, insights, and health indicators
- **Smart Search**: Intelligent search functionality with fuzzy matching for companies, products, and IDs
- **ID Generation**: Step-by-step ID creation with real-time progress tracking
- **RAG Pipeline**: Advanced retrieval-augmented generation system for querying product documentation using vector embeddings and semantic search
- **Modern UI**: Clean, responsive design built with Tailwind CSS
- **Real-time Updates**: Live data synchronization and statistics updates
- **Professional Design**: Production-ready interface with proper error handling and loading states

## Tech Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Heroicons**: SVG icons library
- **React Hot Toast**: Toast notifications
- **Axios**: HTTP client for API calls

### Backend
- **Flask**: Python web framework
- **Flask-CORS**: Cross-origin resource sharing
- **Pandas**: Data manipulation and analysis
- **Requests**: HTTP library for Ollama API integration

### RAG Pipeline
- **LangChain**: Framework for building LLM applications
- **ChromaDB**: Vector database for embeddings storage
- **Ollama**: Local LLM and embeddings provider
- **BeautifulSoup**: HTML parsing and text extraction
- **HuggingFace Cross-Encoder**: Re-ranking model for improved retrieval accuracy

## Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- Ollama (for version extraction and RAG pipeline) - Optional but recommended

## Quick Start

### 1. Clone and Setup Frontend

```bash
cd react-fuid-system
npm install
```

### 2. Setup Backend

```bash
cd react-fuid-system/backend
pip install flask flask-cors pandas requests
```

### 3. Start the Backend Server

```bash
cd react-fuid-system/backend
python server.py
```

The backend will start on `http://localhost:5001`

### 4. Start the Frontend

```bash
# In the react-fuid-system directory
npm start
```

The application will open at `http://localhost:3000`

## Project Structure

```
RAGapp-pipeline/
├── react-fuid-system/
│   ├── public/
│   │   └── index.html              # Main HTML template
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── Dashboard.js        # Main dashboard component
│   │   │   ├── SearchPage.js       # Search functionality
│   │   │   ├── GeneratePage.js     # ID generation
│   │   │   ├── Sidebar.js          # Navigation sidebar
│   │   │   └── LoadingScreen.js    # Loading state component
│   │   ├── services/
│   │   │   └── api.js              # API service layer
│   │   ├── utils/
│   │   │   ├── textNormalizer.js   # Text processing utilities
│   │   │   └── searchEngine.js     # Search functionality
│   │   ├── App.js                  # Main application component
│   │   ├── index.js                # Application entry point
│   │   └── index.css               # Global styles with Tailwind
│   ├── backend/
│   │   └── server.py               # Flask backend server
│   ├── package.json                # Dependencies and scripts
│   └── tailwind.config.js          # Tailwind configuration
├── RAG/
│   ├── rag_pipeline.py             # Main RAG pipeline implementation
│   ├── data.json                   # Product data for RAG processing
│   ├── chroma/                     # ChromaDB vector store directory
│   ├── requirements.txt            # Python dependencies for RAG
│   └── test_rag.py                 # RAG testing utilities
└── README.md                       # This file
```

## UI Components

### Dashboard
- **Statistics Cards**: Companies, Products, IDs overview
- **Database Insights**: Averages and ratios
- **System Counters**: Next available IDs
- **Health Indicators**: Database status checks
- **Quick Actions**: Navigation shortcuts

### Search Page
- **Smart Search Bar**: Intelligent matching algorithm
- **Search Tips**: User guidance for better results
- **Results Table**: Organized search results
- **Detailed Cards**: Expandable result details

### Generate Page
- **Step-by-Step Process**: Visual progress tracking
- **Form Validation**: Input validation and error handling
- **Real-time Feedback**: Live status updates
- **Result Display**: Generated ID with details

### Sidebar
- **Navigation Menu**: Clean, organized navigation
- **Live Statistics**: Real-time database stats
- **Quick Actions**: Refresh and utility functions
- **Status Indicators**: System health display

## RAG Pipeline Features

The RAG (Retrieval-Augmented Generation) pipeline provides advanced capabilities for querying product documentation:

- **Vector Embeddings**: Converts product descriptions into semantic vector representations using Ollama embeddings
- **Document Chunking**: Intelligently splits product documentation into manageable chunks for efficient retrieval
- **Semantic Search**: Performs similarity-based search across product documentation using ChromaDB
- **Re-ranking Support**: Optional cross-encoder re-ranking for improved retrieval accuracy
- **Context-Aware Responses**: Generates answers based on retrieved product documentation using LLM
- **Metadata Filtering**: Filters results by product ID, platform, and categories
- **HTML Processing**: Extracts and processes HTML content from product descriptions

## Configuration

### Environment Variables

Create a `.env` file in the react-fuid-system root directory:

```env
REACT_APP_API_URL=http://localhost:5001/api
```

### Tailwind CSS

The application uses a custom Tailwind configuration with:
- Custom color palette (primary, success, warning, error)
- Professional typography (Inter font)
- Custom components and utilities
- Responsive design breakpoints

## API Endpoints

### GET `/api/health`
Health check endpoint

### GET `/api/data`
Load all data from JSON file

### POST `/api/data`
Save data to JSON file

### GET `/api/stats`
Get database statistics

### POST `/api/search`
Search for IDs, companies, or products

### POST `/api/generate-fuid`
Generate a new ID

### POST `/api/extract-version`
Extract version from product name using Ollama

## Search Features

- **ID Search**: Exact ID matching
- **Company Search**: Find all products from a company
- **Product Search**: Find products across all companies
- **Smart Matching**: Intelligent fuzzy matching
- **False Positive Prevention**: Minimum length requirements
- **Result Sorting**: Relevance-based result ordering

## Key Features

### Smart Text Normalization
- Unicode normalization
- Case-insensitive matching
- Special character handling
- Whitespace normalization

### Intelligent Search Algorithm
- Exact match priority
- Prefix matching
- Contains matching with length requirements
- Duplicate prevention
- Relevance scoring


---

**Built with React and Tailwind CSS**
