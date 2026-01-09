import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { sendRAGMessage, sendRAGMessageStream, getRAGProductInfo, getRAGStatus, initializeRAG } from '../services/api';

const ProductChatSidebar = ({ selectedProduct, onClose, isVisible }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productInfo, setProductInfo] = useState(null);
  const [ragStatus, setRagStatus] = useState({ embeddings_ready: false });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    if (selectedProduct) {
      loadProductInfo();
      checkRAGStatusAndInitialize();
      
      // Set initial greeting message
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: `Hi! I'm here to help you learn about ${selectedProduct.product || 'this product'}. Ask me anything about its features, specifications, or capabilities!`,
        timestamp: new Date()
      }]);
    }
  }, [selectedProduct]);

  const loadProductInfo = async () => {
    if (!selectedProduct?.fuid) return;
    
    try {
      const response = await getRAGProductInfo(selectedProduct.fuid);
      if (response.success) {
        setProductInfo(response.product_info);
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    }
  };

  const checkRAGStatusAndInitialize = async () => {
    try {
      setIsLoadingStatus(true);
      const status = await getRAGStatus();
      setRagStatus(status);
      
      // If RAG is not initialized or has no embeddings, try to initialize it
      if (!status.embeddings_ready || status.total_products === 0) {
        console.log('RAG not initialized, attempting to initialize...');
        try {
          const initResult = await initializeRAG();
          if (initResult.success) {
            console.log(`RAG initialized with ${initResult.chunk_count} chunks`);
            // Refresh status after initialization
            const newStatus = await getRAGStatus();
            setRagStatus(newStatus);
          } else {
            console.warn('RAG initialization returned success=false:', initResult);
          }
        } catch (initError) {
          console.warn('RAG initialization failed (Ollama may not be running):', initError);
          // Don't set error - RAG can still work with existing embeddings
        }
      }
    } catch (error) {
      console.error('Error checking RAG status:', error);
      setRagStatus({ embeddings_ready: false, error: true });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !selectedProduct?.fuid) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Create streaming assistant message
    const assistantMessageId = Date.now() + 1;
    const streamingMessage = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      contextUsed: [],
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, streamingMessage]);

    try {
      // Prepare conversation history for the API - exclude the initial system greeting
      const conversationHistory = messages
        .filter(msg => !msg.content.includes("Hi! I'm here to help you learn about")) // Filter out initial greeting
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      console.log('Sending streaming RAG request:', {
        query: currentInput,
        fuid: selectedProduct.fuid,
        historyLength: conversationHistory.length
      });

      await sendRAGMessageStream(
        currentInput,
        selectedProduct.fuid,
        conversationHistory,
        // onChunk callback
        (chunk) => {
          if (chunk.type === 'context') {
            // Store context info but don't display sources at the beginning
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, contextUsed: chunk.data }
                : msg
            ));
          } else if (chunk.type === 'text') {
            // Update streaming text
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: chunk.fullResponse }
                : msg
            ));
          }
        },
        // onComplete callback
        (fullResponse, contextUsed) => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullResponse, contextUsed: contextUsed || [], isStreaming: false }
              : msg
          ));
          setIsLoading(false);
        },
        // onError callback
        (error) => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: `Sorry, I encountered an error: ${error}`,
                  isStreaming: false 
                }
              : msg
          ));
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error sending streaming message:', error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}`,
              isStreaming: false 
            }
          : msg
      ));
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-[60] backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Chat Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-[80] flex flex-col transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              💬
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Product Chat</h2>
              <p className="text-blue-100 text-sm leading-tight break-words overflow-hidden font-medium" style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                maxHeight: '2.5rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {selectedProduct?.product || 'Product Information'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* RAG Status Info */}
        {!isLoadingStatus && ragStatus.embeddings_ready && ragStatus.dynamic_mode && (
          <div className="bg-green-50 border-b border-green-200 p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-green-800">
                Dynamic RAG ready • {ragStatus.total_products?.toLocaleString()} products loaded
              </p>
            </div>
          </div>
        )}
        
        {!isLoadingStatus && !ragStatus.embeddings_ready && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-3">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                RAG system not initialized. Responses may be limited.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                  )}
                </p>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </p>
                
                {/* Sources section removed - no longer showing context sources */}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg max-w-xs">
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about this product..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500 bg-white"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Status info */}
          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {ragStatus.embeddings_ready && ragStatus.dynamic_mode && (
              <span className="text-blue-600">⚡ Dynamic RAG</span>
            )}
            {ragStatus.embeddings_ready && !ragStatus.dynamic_mode && (
              <span className="text-green-600">✓ RAG Ready</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductChatSidebar;