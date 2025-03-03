// src/utils/apiErrorHandler.js
/**
 * Creates an enhanced API client with automatic retries and error handling
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Base delay in ms between retries, will use exponential backoff (default: 1000)
 * @param {Function} options.onError - Optional callback for handling errors
 * @returns {Function} - Enhanced fetch function that handles errors and retries
 */
export const createApiClient = (options = {}) => {
  const { 
    maxRetries = 3, 
    retryDelay = 1000,
    onError = null
  } = options;
  
  return async (url, config = {}) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API request to ${url} (attempt ${attempt}/${maxRetries})`);
        const response = await fetch(url, config);
        
        if (!response.ok) {
          // Try to get error details from response body
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (e) {
            // If not JSON, just continue with status text
          }
          
          const error = {
            status: response.status,
            statusText: response.statusText,
            message: errorData.error || response.statusText,
            data: errorData
          };
          
          console.warn(`API request failed with status ${response.status}: ${error.message}`);
          
          // For certain error types, don't retry
          if (response.status === 404) {
            throw error;
          }
          
          lastError = error;
          
          // Call the error handler if provided
          if (onError) {
            onError(error, { 
              attempt, 
              maxRetries, 
              willRetry: attempt < maxRetries 
            });
          }
          
          // If not the last attempt, retry after delay
          if (attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw error;
        }
        
        // Success - parse JSON response
        const data = await response.json();
        return data;
      } catch (error) {
        // Network or parsing errors
        console.error(`API request error:`, error);
        lastError = error;
        
        // Call the error handler if provided
        if (onError) {
          onError(error, { 
            attempt, 
            maxRetries, 
            willRetry: attempt < maxRetries 
          });
        }
        
        // If not the last attempt, retry after delay
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    // This should never be reached, but just in case
    throw lastError || new Error('API request failed after retries');
  };
};

/**
 * Helper to handle fetch with error handling, but without retry logic
 * 
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - The parsed JSON response
 */
export const fetchWithErrorHandling = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // If not JSON, just continue with status text
      }
      
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.error || response.statusText,
        data: errorData
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

/**
 * Helper to stringify and parse objects with special handling for circular references
 * Useful for debugging and logging API responses
 */
export const safeStringify = (obj, indent = 2) => {
  let cache = [];
  const result = JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.includes(value)) {
        return '[Circular Reference]';
      }
      cache.push(value);
    }
    return value;
  }, indent);
  
  cache = null; // Enable garbage collection
  return result;
};