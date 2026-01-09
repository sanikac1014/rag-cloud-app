# FUID Management System - React Edition

A production-ready React application for managing Flywl Unique Identifiers (FUIDs) with a modern, professional interface built using React, Tailwind CSS, and Flask backend.

## 🚀 Features

- **Dashboard**: Comprehensive overview with statistics, insights, and health indicators
- **Smart Search**: Intelligent search functionality with fuzzy matching for companies, products, and FUIDs
- **FUID Generation**: Step-by-step FUID creation with real-time progress tracking
- **Modern UI**: Clean, responsive design built with Tailwind CSS
- **Real-time Updates**: Live data synchronization and statistics updates
- **Professional Design**: Production-ready interface with proper error handling and loading states

## 🛠 Tech Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Heroicons**: Beautiful SVG icons
- **React Hot Toast**: Elegant toast notifications
- **Axios**: HTTP client for API calls

### Backend
- **Flask**: Python web framework
- **Flask-CORS**: Cross-origin resource sharing
- **Pandas**: Data manipulation and analysis
- **Requests**: HTTP library for Ollama API integration

## 📋 Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- Ollama (for version extraction) - Optional but recommended

## 🚀 Quick Start

### 1. Clone and Setup Frontend

```bash
cd Unique-id/react-fuid-system
npm install
```

### 2. Setup Backend

```bash
cd backend
pip install flask flask-cors pandas requests
```

### 3. Start the Backend Server

```bash
cd backend
python server.py
```

The backend will start on `http://localhost:5001`

### 4. Start the Frontend

```bash
# In the react-fuid-system directory
npm start
```

The application will open at `http://localhost:3000`

## 📁 Project Structure

```
react-fuid-system/
├── public/
│   └── index.html              # Main HTML template
├── src/
│   ├── components/             # React components
│   │   ├── Dashboard.js        # Main dashboard component
│   │   ├── SearchPage.js       # Search functionality
│   │   ├── GeneratePage.js     # FUID generation
│   │   ├── Sidebar.js          # Navigation sidebar
│   │   └── LoadingScreen.js    # Loading state component
│   ├── services/
│   │   └── api.js              # API service layer
│   ├── utils/
│   │   ├── textNormalizer.js   # Text processing utilities
│   │   └── searchEngine.js     # Search functionality
│   ├── App.js                  # Main application component
│   ├── index.js                # Application entry point
│   └── index.css               # Global styles with Tailwind
├── backend/
│   └── server.py               # Flask backend server
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind configuration
└── README.md                   # This file
```

## 🎨 UI Components

### Dashboard
- **Statistics Cards**: Companies, Products, FUIDs overview
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
- **Result Display**: Generated FUID with details

### Sidebar
- **Navigation Menu**: Clean, organized navigation
- **Live Statistics**: Real-time database stats
- **Quick Actions**: Refresh and utility functions
- **Status Indicators**: System health display

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:5001/api
```

### Tailwind CSS

The application uses a custom Tailwind configuration with:
- Custom color palette (primary, success, warning, error)
- Professional typography (Inter font)
- Custom components and utilities
- Responsive design breakpoints

## 📊 API Endpoints

### GET `/api/health`
Health check endpoint

### GET `/api/data`
Load all data from JSON file

### POST `/api/data`
Save data to JSON file

### GET `/api/stats`
Get database statistics

### POST `/api/search`
Search for FUIDs, companies, or products

### POST `/api/generate-fuid`
Generate a new FUID

### POST `/api/extract-version`
Extract version from product name using Ollama

## 🔍 Search Features

- **FUID Search**: Exact FUID matching
- **Company Search**: Find all products from a company
- **Product Search**: Find products across all companies
- **Smart Matching**: Intelligent fuzzy matching
- **False Positive Prevention**: Minimum length requirements
- **Result Sorting**: Relevance-based result ordering

## 🎯 Key Features

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

### Professional UI/UX
- Loading states and spinners
- Error handling and recovery
- Toast notifications
- Responsive design
- Accessibility considerations

## 🚀 Production Deployment

### Build for Production

```bash
npm run build
```

### Backend Production Setup

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 server:app
```

### Environment Configuration

- Set `REACT_APP_API_URL` to your production API URL
- Configure CORS settings for your domain
- Set up proper error logging
- Configure database backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is proprietary software developed for Flywl.

## 🆘 Support

For support and questions:
- Check the API health endpoint: `/api/health`
- Review browser console for errors
- Ensure Ollama is running (if using version extraction)
- Verify backend server is accessible

---

**Built with ❤️ using React and Tailwind CSS** 