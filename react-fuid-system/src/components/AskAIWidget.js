import React, { useState } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const AskAIWidget = () => {
  const [question, setQuestion] = useState('');
  const [productId, setProductId] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    setAnswer('');
    setIsLoading(true);

    try {
      // Prepare request payload
      const payload = {
        question: question.trim()
      };

      // Add id if provided
      if (productId.trim()) {
        payload.id = productId.trim();
      }

      // Make POST request
      const response = await axios.post('http://localhost:8000/ask', payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for LLM responses
      });

      // Handle success
      if (response.data && response.data.answer) {
        setAnswer(response.data.answer);
      } else {
        setError('Received an invalid response from the server.');
      }
    } catch (err) {
      // Handle error
      if (err.response) {
        // Server responded with error status
        setError(err.response.data?.detail || err.response.data?.error || 'An error occurred while processing your question.');
      } else if (err.request) {
        // Request was made but no response received
        setError('Unable to connect to the server. Please check if the backend is running.');
      } else {
        // Something else happened
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-white">Ask AI</h3>
        <p className="text-sm text-flywl-grey-300 mt-1">
          Ask questions about products, features, or get recommendations
        </p>
      </div>
      
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Textarea */}
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-flywl-grey-200 mb-2">
              Question <span className="text-flywl-orange-400">*</span>
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What do you recommend? Is this product good for X use case? What's the difference between A and B?"
              rows={4}
              className="input-field resize-none"
              required
              disabled={isLoading}
            />
          </div>

          {/* Optional Product ID/Name Input */}
          <div>
            <label htmlFor="productId" className="block text-sm font-medium text-flywl-grey-200 mb-2">
              Product ID / Name <span className="text-flywl-grey-400 text-xs">(optional)</span>
            </label>
            <input
              id="productId"
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="e.g., FUID-XXXX-XXXX-XX or product name"
              className="input-field"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center"
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                Ask AI
              </>
            )}
          </button>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-6 p-4 bg-flywl-grey-900 rounded-lg border border-flywl-grey-700">
            <div className="flex items-center text-flywl-grey-300">
              <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              <span>Getting answer from AI...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-flywl-maroon-900 rounded-lg border border-flywl-maroon-700">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-flywl-maroon-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-flywl-maroon-200">Error</p>
                <p className="text-sm text-flywl-maroon-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Answer Display */}
        {answer && !isLoading && (
          <div className="mt-6 p-4 bg-flywl-grey-900 rounded-lg border border-flywl-grey-700">
            <p className="text-sm font-medium text-flywl-grey-200 mb-2">Answer</p>
            <div className="text-flywl-grey-100 whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AskAIWidget;

