/**
 * Normalize text by:
 * 1. Converting to lowercase
 * 2. Unicode normalization
 * 3. Removing punctuation and special characters
 */
export const normalizeText = (text) => {
  if (!text || text === null || text === undefined) {
    return "";
  }
  
  // Convert to string if not already
  text = String(text);
  
  // Step 1: Convert to lowercase
  text = text.toLowerCase();
  
  // Step 2: Unicode normalization (NFD - Canonical Decomposition)
  text = text.normalize('NFD');
  
  // Step 3: Remove punctuation and special characters (except dots)
  // Keep only alphanumeric characters, spaces, and dots
  text = text.replace(/[^\w\s.]/g, '');
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

/**
 * Generate a unique company ID from company name and counter
 */
export const generateCompanyId = (companyName, counter) => {
  if (!companyName || companyName === null || companyName === undefined) {
    return `UNKNOWN${String(counter).padStart(5, '0')}`;
  }
  
  // Clean the company name and split into words
  const cleanedName = String(companyName).replace(/[^a-zA-Z0-9\s]/g, ' ');
  const words = cleanedName.split(' ').filter(word => word.length > 0);
  
  // Take first 5 characters from the cleaned name
  const firstFiveChars = words.join('').substring(0, 5);
  if (!firstFiveChars) {
    return `UNKNOWN${String(counter).padStart(5, '0')}`;
  }
  
  // Capitalize the characters
  const idPrefix = firstFiveChars.toUpperCase();
  
  // Append the counter with leading zeros
  const uniqueId = `${idPrefix}:${String(counter).padStart(5, '0')}`;
  
  return uniqueId;
};

/**
 * Generate a unique product ID with 4-digit counter
 */
export const generateProductId = (counter) => {
  return String(counter).padStart(4, '0');
};

/**
 * Generate version ID
 */
export const generateVersionId = (version) => {
  return String(version);
};

/**
 * Generate FUID in the format FUID-{company_id}-{product_id}-{version}
 */
export const generateFuid = (companyId, productId, version) => {
  // Clean version string
  let cleanVersion = version;
  if (!version || version === null || version === undefined || String(version).toUpperCase() === "NO VERSION FOUND") {
    cleanVersion = "NA";
  } else {
    cleanVersion = String(version).replace(/\s/g, "");
  }
  
  return `FUID-${companyId}-${productId}-${cleanVersion}`;
};

/**
 * Format numbers with commas for display
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Calculate time ago from timestamp
 */
export const timeAgo = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}; 