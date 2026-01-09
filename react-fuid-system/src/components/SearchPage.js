import React, { useState } from 'react';
import { 
  MagnifyingGlassIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { searchDatabase } from '../services/api';
import ProductChatSidebar from './ProductChatSidebar';
import toast from 'react-hot-toast';

const SearchPage = ({ data, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [closestMatchInfo, setClosestMatchInfo] = useState(null);
  const [suppressClosestMatch, setSuppressClosestMatch] = useState(false);
  
  // Chat sidebar states
  const [selectedProductForChat, setSelectedProductForChat] = useState(null);
  const [isChatVisible, setIsChatVisible] = useState(false);

  // Group results by FUID and collate platforms
  const groupResultsByFuid = (items) => {
    const order = ['AWS', 'Azure', 'GCP'];
    const groups = new Map();
    for (const r of items) {
      const key = r.fuid || `${r.company}::${r.product}`;
      const g = groups.get(key) || {
        fuid: r.fuid,
        company: r.company,
        product: r.product,
        version: r.version,
        company_id: r.company_id,
        product_id: r.product_id,
        version_id: r.version_id,
        categories: r.categories,
        relevance_score: r.relevance_score || 0,
        platforms: []
      };
      const platName = (r.platform || '').trim();
      const url = (r.url || '').trim();
      if (platName && !g.platforms.find(p => p.name.toLowerCase() === platName.toLowerCase())) {
        g.platforms.push({ name: platName, url });
      }
      if ((r.relevance_score || 0) > (g.relevance_score || 0)) {
        g.relevance_score = r.relevance_score;
      }
      groups.set(key, g);
    }
    const grouped = Array.from(groups.values()).map(g => {
      g.platforms.sort((a, b) => {
        const ai = order.indexOf(a.name);
        const bi = order.indexOf(b.name);
        if (ai !== -1 || bi !== -1) {
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }
        return a.name.localeCompare(b.name);
      });
      return g;
    });
    grouped.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    return grouped;
  };

  // Extract unique companies and products from the data
  const getUniqueCompaniesAndProducts = () => {
    if (!data || !data.fuid_mappings) return { companies: [], products: [] };
    
    const companies = new Set();
    const products = new Set();
    
    Object.values(data.fuid_mappings).forEach(fuidData => {
      if (fuidData.company) {
        companies.add(fuidData.company);
      }
      if (fuidData.product) {
        products.add(fuidData.product);
      }
    });
    
    return {
      companies: Array.from(companies).sort(),
      products: Array.from(products).sort()
    };
  };

  // Generate suggestions based on search query
  const generateSuggestions = (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const { companies, products } = getUniqueCompaniesAndProducts();
    const lowerQuery = query.toLowerCase();
    
    // Helper function to score matches (higher score = better match)
    const getMatchScore = (text, query) => {
      const lowerText = text.toLowerCase();
      if (lowerText.startsWith(query)) {
        return 3; // Highest priority: starts with query
      } else if (lowerText.includes(` ${query}`)) {
        return 2; // Medium priority: word boundary match
      } else if (lowerText.includes(query)) {
        return 1; // Lower priority: contains query
      }
      return 0; // No match
    };
    
    // Filter and score companies
    const companySuggestions = companies
      .map(company => ({
        type: 'Company',
        value: company,
        score: getMatchScore(company, lowerQuery)
      }))
      .filter(item => item.score > 0);
    
    // Filter and score products
    const productSuggestions = products
      .map(product => ({
        type: 'Product',
        value: product,
        score: getMatchScore(product, lowerQuery)
      }))
      .filter(item => item.score > 0);
    
    // Combine, sort by relevance then alphabetically, and limit to top 10
    const allSuggestions = [...companySuggestions, ...productSuggestions]
      .sort((a, b) => {
        // First sort by score (descending - higher scores first)
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        // Then sort alphabetically within same score
        return a.value.localeCompare(b.value);
      })
      .slice(0, 10)
      .map(({ type, value }) => ({ type, value })); // Remove score from final result
    
    setSuggestions(allSuggestions);
    setShowSuggestions(allSuggestions.length > 0);
  };

  // Handle input change with suggestions
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedSuggestion(-1);
    generateSuggestions(value);
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.value);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestion(-1);
    setSuppressClosestMatch(false); // Allow closest match for auto-suggest selections
    
    // Automatically trigger search when suggestion is selected
    if (suggestion.type === 'Company') {
      handleSearchWithQuery(suggestion.value, 'company', suggestion.value);
    } else if (suggestion.type === 'Product') {
      handleSearchWithQuery(suggestion.value, 'product', suggestion.value);
    }
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          selectSuggestion(suggestions[selectedSuggestion]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        break;
    }
  };

  const handleSearchWithQuery = async (query, searchType = null, selectedItem = null) => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    if (query.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setSearching(true);
    
    try {
      // Use new search logic with search type and selected item
      const searchResults = await searchDatabase(query, searchType, selectedItem, 100, 'All');
      const grouped = groupResultsByFuid(searchResults);
      
      // Debug logging to help identify issues
      console.log('Search Results for:', query, grouped);
      
      // Check if this is a closest match search and if we should show the message
      if (grouped.length > 0 && searchResults[0]?.type === 'Closest Match' && !suppressClosestMatch) {
        const closestMatch = searchResults[0].closest_match;
        const originalQuery = searchResults[0].original_query;
        setClosestMatchInfo({ closestMatch, originalQuery });
        toast.success(`Found ${grouped.length} result(s) for closest match: "${closestMatch}"`);
      } else {
        setClosestMatchInfo(null);
        if (grouped.length === 0) {
          if (query.toUpperCase().startsWith('FUID')) {
            toast.error('No results found');
          } else {
            toast.error(`No results found for "${query}"`);
          }
        } else {
          toast.success(`Found ${grouped.length} result(s) for "${query}"`);
        }
      }
      
      // Reset the suppress flag after using it
      setSuppressClosestMatch(false);
      
      setResults(grouped);
      
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    setSuppressClosestMatch(false); // Allow closest match for regular searches
    await handleSearchWithQuery(searchQuery);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion) => {
    setSearchQuery(suggestion.value);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    
    // Search based on the suggestion type
    if (suggestion.type === 'Company') {
      await handleSearchWithQuery(suggestion.value, 'company', suggestion.value);
    } else if (suggestion.type === 'Product') {
      await handleSearchWithQuery(suggestion.value, 'product', suggestion.value);
    }
  };

  // Handle clicking on "Search instead for" link
  const handleSearchInstead = async (originalQuery) => {
    setSearchQuery(originalQuery);
    setClosestMatchInfo(null); // Clear the closest match message
    setSuppressClosestMatch(true); // Suppress closest match for this search
    await handleSearchWithQuery(originalQuery);
  };



  const toggleCardExpansion = (index) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  // Handle chat sidebar
  const handleCloseChatSidebar = () => {
    setIsChatVisible(false);
    setSelectedProductForChat(null);
  };

  const getMatchTypeColor = (type) => {
    switch (type) {
      case 'FUID Match':
        return 'bg-primary-100 text-primary-800';
      case 'Company Match':
        return 'bg-success-100 text-success-800';
      case 'Product Match':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-flywl-radial flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-flywl-grey-300">Loading search functionality...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-flywl-radial animate-gradient transition-all duration-300 ease-in-out ${
      isChatVisible ? 'mr-96 shadow-2xl' : ''
    }`}>
      {/* Header */}
      <div className={`bg-flywl-grey-800 border-b border-flywl-grey-700 relative z-10 transition-all duration-300 ${
        isChatVisible ? 'shadow-flywl border-flywl-orange-700' : ''
      }`}>
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">🔍 Search for Company/Product</h1>
              <p className="text-flywl-grey-300 mt-1">Find companies, products, and unique identifiers in your database</p>
            </div>
            {isChatVisible && (
              <div className="flex items-center space-x-2 text-flywl-orange-400 bg-flywl-orange-900 px-3 py-2 rounded-lg border border-flywl-orange-700">
                <div className="w-2 h-2 bg-flywl-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Chat Active</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`px-8 py-8 flex flex-col items-center transition-all duration-300 ease-in-out ${isChatVisible ? 'pr-4' : ''}`}>
        {/* Search Tips */}
        <div className="bg-flywl-grey-800 border border-flywl-grey-700 rounded-lg p-4 mb-8 max-w-5xl w-full">
          <div className="flex">
            <InformationCircleIcon className="w-5 h-5 text-flywl-orange-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-flywl-orange-400 mb-2">Search Tips:</h3>
              <ul className="text-sm text-flywl-grey-300 space-y-1">
                <li>• <strong>Auto-suggest</strong>: Start typing to see suggestions for existing companies and products</li>
                <li>• Enter a <strong>company name</strong> to find all products from that company (e.g., Microsoft, Powtoon)</li>
                <li>• Enter a <strong>product name</strong> to find products across all companies (e.g., Windows, Chrome)</li>
                <li>• <strong>Smart matching</strong>: Search uses intelligent matching to avoid false positives</li>
                <li>• <strong>Keyboard navigation</strong>: Use arrow keys to navigate suggestions, Enter to select</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Search Interface */}
        <div className={`card mb-8 max-w-5xl w-full transition-all duration-300 ${
          isChatVisible ? 'relative z-20 shadow-xl' : 'relative z-10'
        }`} style={{ overflow: 'visible' }}>
          <div className="card-body" style={{ overflow: 'visible' }}>
            <div className="flex gap-4">
              <div className="flex-1 relative" style={{ zIndex: 1000 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => generateSuggestions(searchQuery)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g., 'Microsoft' or 'Windows' or 'server'"
                  className={`input-field transition-all duration-200 ${
                    isChatVisible ? 'focus:ring-4 focus:ring-blue-200' : ''
                  }`}
                  disabled={searching}
                  autoComplete="off"
                />
                
                {/* Auto-suggest Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    className="absolute top-full left-0 right-0 bg-flywl-grey-800 border border-flywl-grey-600 rounded-lg shadow-flywl mt-1 max-h-64 overflow-y-auto"
                    style={{ 
                      zIndex: 10001,
                      boxShadow: '0 25px 50px -12px rgba(249, 115, 22, 0.15), 0 0 0 1px rgba(249, 115, 22, 0.1)'
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className={`px-4 py-3 cursor-pointer border-b border-flywl-grey-700 last:border-b-0 transition-colors duration-150 ${
                          selectedSuggestion === index 
                            ? 'bg-flywl-orange-900 text-flywl-orange-300' 
                            : 'text-flywl-grey-200 hover:bg-flywl-grey-700'
                        }`}
                        onClick={() => selectSuggestion(suggestion)}
                        onMouseEnter={() => setSelectedSuggestion(index)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate mr-2">{suggestion.value}</span>
                          <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            suggestion.type === 'Company' 
                              ? 'bg-success-900 text-success-300 border border-success-700' 
                              : 'bg-flywl-orange-900 text-flywl-orange-300 border border-flywl-orange-700'
                          }`}>
                            {suggestion.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="btn-primary px-6"
              >
                {searching ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Closest Match Message */}
        {closestMatchInfo && (
          <div className="mb-6 max-w-5xl w-full">
            <div className="bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg p-4">
              <p className="text-flywl-grey-200 text-sm">
                These are results for: <span className="font-semibold text-flywl-orange-400">"{closestMatchInfo.closestMatch}"</span>
              </p>
              <p className="text-flywl-grey-300 text-sm mt-1">
                Search instead for{' '}
                <button
                  onClick={() => handleSearchInstead(closestMatchInfo.originalQuery)}
                  className="text-flywl-orange-400 underline hover:text-flywl-orange-300 font-medium"
                >
                  "{closestMatchInfo.originalQuery}"
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
                        {/* Results Cards */}
            <div className="mb-8 max-w-5xl w-full">
              <h3 className="text-lg font-semibold text-flywl-grey-300 mb-6">
                Search Results ({results.length})
              </h3>
              
              <div className="flex flex-col gap-6">
                {results.map((result, index) => {
                  const isExpanded = expandedCards.has(index);
                  return (
                    <div key={index} className="bg-flywl-grey-800 border border-flywl-grey-700 rounded-lg hover:shadow-flywl transition-shadow duration-200 w-full">
                      {/* Clickable Header */}
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => toggleCardExpansion(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-flywl-grey-200 leading-tight">
                              {index + 1}) {result.product || 'Unknown Product'}
                            </h4>
                          </div>
                          <ChevronDownIcon 
                            className={`w-5 h-5 text-flywl-grey-400 transition-transform duration-200 ${
                              isExpanded ? 'transform rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                      
                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-flywl-grey-600">
                          {/* Company Name */}
                          <div className="mb-4 mt-4">
                            <p className="text-sm text-flywl-grey-400 mb-1">Company Name</p>
                            <p className="text-flywl-grey-200 font-medium">
                              {result.company || 'Unknown Company'}
                            </p>
                          </div>
                          
                          {/* Platforms */}
                          {result.platforms && result.platforms.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm text-flywl-grey-400 mb-1">Platforms</p>
                              <ul className="text-flywl-grey-200 space-y-1">
                                {result.platforms.map((platform, pIndex) => (
                                  <li key={pIndex} className="flex items-center">
                                    <span className="text-sm mr-2">{platform.name}</span>
                                    {platform.url && (
                                      <a
                                        href={platform.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-flywl-orange-400 hover:text-flywl-orange-300 font-medium underline"
                                      >
                                        {platform.url}
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Categories */}
                          {result.categories && result.categories !== 'NA' && (
                            <div className="mb-4">
                              <p className="text-sm text-flywl-grey-400 mb-1">Categories</p>
                              <p className="text-flywl-grey-200">
                                {result.categories}
                              </p>
                            </div>
                          )}
                          
                          {/* Detailed Score Breakdown */}
                          {(result.fuzzy_similarity !== null && result.fuzzy_similarity !== undefined && !isNaN(result.fuzzy_similarity)) && (
                            <div className="mb-4">
                              <p className="text-sm text-flywl-grey-400 mb-2">Score Breakdown</p>
                              <div className="space-y-2">
                                {result.fuzzy_similarity !== null && result.fuzzy_similarity !== undefined && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-flywl-grey-300">String Similarity:</span>
                                    <span className="text-sm font-medium text-flywl-orange-400">
                                      {typeof result.fuzzy_similarity === 'number' 
                                        ? (result.fuzzy_similarity > 1 ? (result.fuzzy_similarity / 100).toFixed(2) : result.fuzzy_similarity.toFixed(2))
                                        : parseFloat(result.fuzzy_similarity || 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {result.relevance_score !== null && result.relevance_score !== undefined && !isNaN(result.relevance_score) && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-flywl-grey-300">Relevance Score:</span>
                                    <span className="text-sm font-medium text-flywl-orange-400">
                                      {typeof result.relevance_score === 'number'
                                        ? (result.relevance_score > 1 ? (result.relevance_score / 100).toFixed(2) : result.relevance_score.toFixed(2))
                                        : parseFloat(result.relevance_score || 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="mt-6 flex gap-3">
                            {/* Chat Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductForChat(result);
                                setIsChatVisible(true);
                              }}
                              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-orange-500/70 text-black text-sm font-medium rounded-lg hover:bg-yellow-500/70 transition-colors duration-200"
                            >
                              <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                              Ask AI
                            </button>
                            
                            {/* Removed View Product button (platform name is now the link) */}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>


          </>
        )}

        {/* No Results State */}
        {searchQuery && results.length === 0 && !searching && (
          <div className="text-center py-12 max-w-5xl w-full">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-4">
              No results found for "<strong>{searchQuery}</strong>"
            </p>
            <p className="text-gray-500">
              Try searching with different terms or check the spelling.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && results.length === 0 && (
          <div className="text-center py-12 max-w-5xl w-full">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to search</h3>
            <p className="text-gray-600">
              Enter a company name, or product name to get started.
            </p>
          </div>
        )}
      </div>
      
      {/* Product Chat Sidebar */}
      <ProductChatSidebar
        selectedProduct={selectedProductForChat}
        onClose={handleCloseChatSidebar}
        isVisible={isChatVisible}
      />
    </div>
  );
};

export default SearchPage; 