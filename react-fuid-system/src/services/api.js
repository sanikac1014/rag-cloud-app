import axios from 'axios';

// Base URL for API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  // Increase timeout to accommodate local LLM latencies
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const apiSignup = async (payload) => {
  const res = await api.post('/auth/signup', payload);
  return res.data;
};

export const apiLogin = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const apiUpdateProfile = async (email, updates) => {
  const res = await api.put('/auth/profile', { email, updates });
  return res.data;
};

export const apiChangePassword = async (email, currentPassword, newPassword) => {
  const res = await api.post('/auth/change-password', { email, currentPassword, newPassword });
  return res.data;
};

export const apiForgotPassword = async (email) => {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
};

export const apiResetPassword = async (token, newPassword) => {
  const res = await api.post('/auth/reset-password', { token, newPassword });
  return res.data;
};

/**
 * Load existing data from JSON file
 */
export const loadExistingData = async () => {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Error loading data:', error);
    
    // Return default data structure if API fails
    return {
      company_mappings: {},
      product_mappings: {},
      version_mappings: {},
      fuid_mappings: {},
      company_embeddings: {},
      product_embeddings: {},
      next_company_counter: 1,
      next_product_counter: 1,
      next_version_counter: 1,
      next_fuid_counter: 1,
      total_companies: 0,
      total_products: 0,
      total_versions: 0,
      total_fuids: 0
    };
  }
};

/**
 * Save data to JSON file
 */
export const saveData = async (data) => {
  try {
    const response = await api.post('/data', data);
    return response.data;
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
};

/**
 * Extract version information using Ollama LLM
 */
export const extractVersionWithOllama = async (productName) => {
  const promptTemplate = `You are cloud marketplace expert.Extract only the version, year, or level number from the product name. Return ONLY the version/number, nothing else.
If you come across a number that could indicate the year/version/level the product might belong to but 
is not explicitly stated, return the NUMBER ONLY.
If no version exists, return "NO VERSION FOUND"

These are some of the Examples you can use to understand the pattern:
- intellicus bi server v22.1 5 users → 22.1
- dockermaventerraform on windows server2022 → 2022  
- siemonster v5 training non mssps → 5
- windows server 2019 datacenter hardened image level 1 → 2019-level1

Product name: ${productName}
Version: `;

  try {
    // Try to call Ollama API directly first
    const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2',
      prompt: promptTemplate,
      stream: false
    }, {
      timeout: 30000
    });
    
    if (ollamaResponse.status === 200 && ollamaResponse.data.response) {
      return ollamaResponse.data.response.trim();
    }
  } catch (ollamaError) {
    console.warn('Direct Ollama API call failed, trying through backend:', ollamaError.message);
    
    // Fallback to backend API
    try {
      const response = await api.post('/extract-version', { 
        product_name: productName 
      });
      return response.data.version || "NO VERSION FOUND";
    } catch (backendError) {
      console.error('Backend version extraction failed:', backendError);
      return "NO VERSION FOUND";
    }
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return {
      total_companies: 0,
      total_products: 0,
      total_fuids: 0,
      last_updated: null
    };
  }
};

/**
 * Search FUIDs, companies, or products with new search logic
 */
export const searchDatabase = async (query, searchType = null, selectedItem = null, kVal = 100, platformFilter = 'All') => {
  try {
    const requestData = { 
      query,
      search_type: searchType,
      selected_item: selectedItem,
      k_val: kVal,
      platform_filter: platformFilter
    };
    
    console.log('API Request:', requestData);
    
    const response = await api.post('/search', requestData);
    
    console.log('API Response:', response.data);
    
    return response.data.results || [];
  } catch (error) {
    console.error('Error searching database:', error);
    throw error;
  }
};

/**
 * Generate a new FUID
 */
/**
 * Format version string according to FUID requirements
 * Split on "." and join with "-", pad single digits with leading zero
 * Example: "22.7" becomes "22-07", "5" becomes "05"
 */
const formatVersionForFuid = (version) => {
  if (!version || version === 'NO VERSION FOUND') {
    return '00';
  }
  
  // Split version on dots
  const parts = version.split('.');
  
  // Format each part: pad single digits with leading zero
  const formattedParts = parts.map(part => {
    const trimmed = part.trim();
    // If it's a single digit, pad with leading zero
    if (/^\d$/.test(trimmed)) {
      return `0${trimmed}`;
    }
    // Otherwise use as many digits as there are
    return trimmed;
  });
  
  // Join with hyphens
  return formattedParts.join('-');
};

export const generateNewFuid = async (companyName, productName, version = '00') => {
  try {
    const response = await api.post('/generate-fuid', {
      company_name: companyName,
      product_name: productName,
      version
    });
    
    // Format the version in the response
    if (response.data && response.data.version) {
      response.data.version.formatted = formatVersionForFuid(response.data.version.version);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error generating FUID:', error);
    throw error;
  }
};

/**
 * Export data as CSV
 */
export const exportDataAsCSV = async () => {
  try {
    const response = await api.get('/export/csv', {
      responseType: 'blob'
    });
    
    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fuid_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

/**
 * Check API health
 */
export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('API health check failed:', error);
    return { status: 'error', message: 'API not available' };
  }
};

// RAG Chat API functions
/**
 * Initialize RAG embeddings
 */
export const initializeRAG = async () => {
  try {
    const response = await api.post('/rag/initialize');
    return response.data;
  } catch (error) {
    console.error('Error initializing RAG:', error);
    throw error;
  }
};

/**
 * Send chat message to RAG system
 */
export const sendRAGMessage = async (query, productFuid, conversationHistory = []) => {
  try {
    console.log('Sending RAG request:', { query, productFuid, historyLength: conversationHistory.length });
    
    const response = await api.post('/rag/chat', {
      query,
      product_fuid: productFuid,
      conversation_history: conversationHistory
    });
    
    console.log('RAG API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending RAG message:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // Re-throw with more context
    const errorMessage = error.response?.data?.error || error.message || 'Network error occurred';
    throw new Error(errorMessage);
  }
};

/**
 * Send streaming chat message to RAG system
 */
export const sendRAGMessageStream = async (query, productFuid, conversationHistory = [], onChunk, onComplete, onError) => {
  try {
    console.log('Sending streaming RAG request:', { query, productFuid, historyLength: conversationHistory.length });
    
    const response = await fetch(`${API_BASE_URL}/rag/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        product_fuid: productFuid,
        conversation_history: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              onError(data.error);
              return;
            }
            
            if (data.context_used) {
              // Handle context info
              onChunk({ type: 'context', data: data.context_used });
            } else if (data.chunk) {
              // Handle text chunk
              onChunk({ type: 'text', data: data.chunk, fullResponse: data.full_response });
            } else if (data.done) {
              // Handle completion
              onComplete(data.full_response, data.context_used);
              return;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in streaming RAG message:', error);
    onError(error.message || 'Network error occurred');
  }
};

/**
 * Get product information for RAG chat
 */
export const getRAGProductInfo = async (productFuid) => {
  try {
    const response = await api.get(`/rag/product-info/${productFuid}`);
    return response.data;
  } catch (error) {
    console.error('Error getting RAG product info:', error);
    throw error;
  }
};

/**
 * Get RAG system status
 */
export const getRAGStatus = async () => {
  try {
    const response = await api.get('/rag/status');
    return response.data;
  } catch (error) {
    console.error('Error getting RAG status:', error);
    throw error;
  }
};

export default api; 