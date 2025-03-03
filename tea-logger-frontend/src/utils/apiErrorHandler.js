// src/utils/apiErrorHandler.js

/**
 * Handles API request errors with retry capability
 * @param {Function} apiCall - The API function to call
 * @param {Object} options - Options for error handling
 * @param {number} options.maxRetries - Maximum number of retry attempts
 * @param {number} options.retryDelay - Base delay between retries in ms
 * @param {Function} options.onError - Optional callback when error occurs
 * @returns {Promise} - Result of the API call or throws enhanced error
 */
export const withErrorHandling = async (apiCall, options = {}) => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      onError = null,
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Attempt the API call
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        // Determine if we should retry based on the error
        const shouldRetry = (
          attempt < maxRetries && 
          isRetryableError(error)
        );
        
        if (onError) {
          onError(error, { attempt, maxRetries, willRetry: shouldRetry });
        }
        
        if (!shouldRetry) break;
        
        // Exponential backoff with jitter
        const delay = retryDelay * Math.pow(2, attempt) * (0.9 + Math.random() * 0.2);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we got here, all retries failed
    // Enhance the error with additional information
    const enhancedError = new Error(
      lastError.message || 'API request failed after multiple attempts'
    );
    enhancedError.originalError = lastError;
    enhancedError.retriesExhausted = true;
    
    throw enhancedError;
  };
  
  /**
   * Determines if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error is retryable
   */
  const isRetryableError = (error) => {
    // Network errors are retryable
    if (error.name === 'NetworkError' || 
        error.message?.includes('NetworkError') || 
        error.message?.includes('Failed to fetch')) {
      return true;
    }
    
    // Check for specific status codes that indicate temporary issues
    const statusCode = error.status || (error.response && error.response.status);
    if (statusCode) {
      // 408 Request Timeout, 429 Too Many Requests, 5xx Server errors
      return [408, 429, 500, 502, 503, 504].includes(statusCode);
    }
    
    return false;
  };
  
  /**
   * Creates an enhanced fetch function with error handling and retry logic
   * @param {Object} options - Options for error handling
   * @returns {Function} - Enhanced fetch function
   */
  export const createApiClient = (options = {}) => {
    return async (url, fetchOptions = {}) => {
      const apiCall = async () => {
        const response = await fetch(url, fetchOptions);
        
        // Check if the response is successful
        if (!response.ok) {
          const error = new Error(`Request failed with status ${response.status}`);
          error.status = response.status;
          error.statusText = response.statusText;
          
          // Try to parse error response
          try {
            error.data = await response.json();
          } catch (e) {
            // If parsing fails, just use text
            error.data = await response.text();
          }
          
          throw error;
        }
        
        return response.json();
      };
      
      return withErrorHandling(apiCall, options);
    };
  };
  
  // Example usage:
  // const apiClient = createApiClient({ maxRetries: 3 });
  // const data = await apiClient('/api/sessions');