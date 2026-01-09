import { normalizeText } from './textNormalizer';

/**
 * Calculate string distance for finding closest matches
 */
const calculateStringDistance = (str1, str2) => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Levenshtein distance implementation
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[s2.length][s1.length];
};

/**
 * Calculate fuzzy score between two strings (0-100)
 */
const calculateFuzzyScore = (query, target) => {
  const distance = calculateStringDistance(query, target);
  const maxLength = Math.max(query.length, target.length);
  if (maxLength === 0) return 100;
  return Math.max(0, 100 - (distance / maxLength) * 100);
};

/**
 * Find closest match in the data
 */
const findClosestMatch = (query, data) => {
  const normalizedQuery = normalizeText(query).toLowerCase();
  let closestMatch = '';
  let bestScore = 0;
  
  const fuidMappings = data.fuid_mappings || {};
  const allTerms = new Set();
  
  // Collect all company and product names
  Object.values(fuidMappings).forEach(details => {
    if (details.company) allTerms.add(details.company.toLowerCase());
    if (details.product) allTerms.add(details.product.toLowerCase());
  });
  
  // Find the closest match
  Array.from(allTerms).forEach(term => {
    const score = calculateFuzzyScore(normalizedQuery, term);
    if (score > bestScore) {
      bestScore = score;
      closestMatch = term;
    }
  });
  
  return closestMatch;
};

/**
 * Main search function with new logic
 */
export const searchFuid = (query, data, searchType = null, selectedItem = null) => {
  const results = [];
  
  // 1. FUID exact match search
  if (query.toUpperCase().startsWith('FUID')) {
    const fuidMappings = data.fuid_mappings || {};
    
    for (const [entryId, details] of Object.entries(fuidMappings)) {
      const fuid = details.fuid || '';
      if (query.toUpperCase() === fuid.toUpperCase()) {
        results.push({
          type: 'FUID Match',
          fuid: fuid,
          company: details.company || '',
          company_id: details.company_id || '',
          product: details.product || '',
          product_id: details.product_id || '',
          version: details.version || '',
          version_id: details.version_id || '',
          url: details.url || '',
          categories: details.categories || '',
          platform: details.platform || '',
          fuzzy_score: 100
        });
      }
    }
    
    return results; // Return immediately for FUID searches
  }
  
  // 2. Auto-suggest selections
  if (searchType === 'company' && selectedItem) {
    const fuidMappings = data.fuid_mappings || {};
    const companyProducts = [];
    
    Object.values(fuidMappings).forEach(details => {
      if (details.company && details.company.toLowerCase() === selectedItem.toLowerCase()) {
        companyProducts.push({
          type: 'Company Match',
          fuid: details.fuid || '',
          company: details.company || '',
          company_id: details.company_id || '',
          product: details.product || '',
          product_id: details.product_id || '',
          version: details.version || '',
          version_id: details.version_id || '',
          url: details.url || '',
          categories: details.categories || '',
          platform: details.platform || '',
          fuzzy_score: 100
        });
      }
    });
    
    // Sort alphabetically by product name
    return companyProducts.sort((a, b) => a.product.localeCompare(b.product));
  }
  
  if (searchType === 'product' && selectedItem) {
    const fuidMappings = data.fuid_mappings || {};
    const productMatches = [];
    
    Object.values(fuidMappings).forEach(details => {
      if (details.product) {
        const fuzzyScore = calculateFuzzyScore(selectedItem.toLowerCase(), details.product.toLowerCase());
        if (fuzzyScore > 0) {
          productMatches.push({
            type: 'Product Match',
            fuid: details.fuid || '',
            company: details.company || '',
            company_id: details.company_id || '',
            product: details.product || '',
            product_id: details.product_id || '',
            version: details.version || '',
            version_id: details.version_id || '',
            url: details.url || '',
            categories: details.categories || '',
            platform: details.platform || '',
            fuzzy_score: fuzzyScore
          });
        }
      }
    });
    
    // Sort by fuzzy score (highest first)
    return productMatches.sort((a, b) => b.fuzzy_score - a.fuzzy_score);
  }
  
  // 3. Direct search with normalization
  const normalizedQuery = normalizeText(query).toLowerCase().trim();
  
  if (normalizedQuery.length < 2) {
    return results;
  }
  
  const fuidMappings = data.fuid_mappings || {};
  let exactMatchFound = false;
  
  // Check for exact matches first
  Object.values(fuidMappings).forEach(details => {
    const normalizedCompany = normalizeText(details.company || '').toLowerCase();
    const normalizedProduct = normalizeText(details.product || '').toLowerCase();
    
    if (normalizedQuery === normalizedCompany || normalizedQuery === normalizedProduct) {
      exactMatchFound = true;
    }
  });
  
  if (exactMatchFound) {
    // Check if the query exactly matches a company name
    let exactCompanyMatch = null;
    let exactProductMatch = null;
    
    Object.values(fuidMappings).forEach(details => {
      const normalizedCompany = normalizeText(details.company || '').toLowerCase();
      const normalizedProduct = normalizeText(details.product || '').toLowerCase();
      
      if (normalizedQuery === normalizedCompany) {
        exactCompanyMatch = details.company;
      }
      if (normalizedQuery === normalizedProduct) {
        exactProductMatch = details.product;
      }
    });
    
    // If exact company match, show all products from that company (like auto-suggest)
    if (exactCompanyMatch) {
      Object.values(fuidMappings).forEach(details => {
        if (details.company && details.company.toLowerCase() === exactCompanyMatch.toLowerCase()) {
          results.push({
            type: 'Company Match',
            fuid: details.fuid || '',
            company: details.company || '',
            company_id: details.company_id || '',
            product: details.product || '',
            product_id: details.product_id || '',
            version: details.version || '',
            version_id: details.version_id || '',
            url: details.url || '',
            categories: details.categories || '',
            platform: details.platform || '',
            fuzzy_score: 100
          });
        }
      });
      
      // Sort alphabetically by product name (same as auto-suggest)
      return results.sort((a, b) => a.product.localeCompare(b.product));
    }
    
    // If exact product match, use fuzzy scoring for that product
    if (exactProductMatch) {
      Object.values(fuidMappings).forEach(details => {
        if (details.product) {
          const fuzzyScore = calculateFuzzyScore(normalizedQuery, details.product.toLowerCase());
          if (fuzzyScore > 80) { // High threshold for exact product matches
            results.push({
              type: 'Product Match',
              fuid: details.fuid || '',
              company: details.company || '',
              company_id: details.company_id || '',
              product: details.product || '',
              product_id: details.product_id || '',
              version: details.version || '',
              version_id: details.version_id || '',
              url: details.url || '',
              categories: details.categories || '',
              platform: details.platform || '',
              fuzzy_score: fuzzyScore
            });
          }
        }
      });
      
      return results.sort((a, b) => b.fuzzy_score - a.fuzzy_score);
    }
  } else {
    // No exact match found - find closest match and return results for it
    const closestMatch = findClosestMatch(query, data);
    
    if (closestMatch) {
      // Check if the closest match is a company or product name
      let isClosestMatchCompany = false;
      let isClosestMatchProduct = false;
      
      Object.values(fuidMappings).forEach(details => {
        const normalizedCompany = normalizeText(details.company || '').toLowerCase();
        const normalizedProduct = normalizeText(details.product || '').toLowerCase();
        
        if (closestMatch === normalizedCompany) {
          isClosestMatchCompany = true;
        }
        if (closestMatch === normalizedProduct) {
          isClosestMatchProduct = true;
        }
      });
      
      // If closest match is a company, show all products from that company
      if (isClosestMatchCompany) {
        Object.values(fuidMappings).forEach(details => {
          const normalizedCompany = normalizeText(details.company || '').toLowerCase();
          if (normalizedCompany === closestMatch) {
            results.push({
              type: 'Closest Match',
              fuid: details.fuid || '',
              company: details.company || '',
              company_id: details.company_id || '',
              product: details.product || '',
              product_id: details.product_id || '',
              version: details.version || '',
              version_id: details.version_id || '',
              url: details.url || '',
              categories: details.categories || '',
              platform: details.platform || '',
              fuzzy_score: 100,
              closest_match: closestMatch,
              original_query: query
            });
          }
        });
        
        // Sort alphabetically by product name (same as company match)
        return results.sort((a, b) => a.product.localeCompare(b.product));
      }
      
      // If closest match is a product, show fuzzy matches for that product
      if (isClosestMatchProduct) {
        Object.values(fuidMappings).forEach(details => {
          if (details.product) {
            const fuzzyScore = calculateFuzzyScore(closestMatch, details.product.toLowerCase());
            if (fuzzyScore > 80) {
              results.push({
                type: 'Closest Match',
                fuid: details.fuid || '',
                company: details.company || '',
                company_id: details.company_id || '',
                product: details.product || '',
                product_id: details.product_id || '',
                version: details.version || '',
                version_id: details.version_id || '',
                url: details.url || '',
                categories: details.categories || '',
                platform: details.platform || '',
                fuzzy_score: fuzzyScore,
                closest_match: closestMatch,
                original_query: query
              });
            }
          }
        });
        
        return results.sort((a, b) => b.fuzzy_score - a.fuzzy_score);
      }
    }
  }
  
  return results;
}; 