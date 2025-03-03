// src/components/common/ErrorDisplay.js
import React from 'react';
import './ErrorDisplay.css';
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ErrorDisplay = ({ 
  error, 
  errorInfo, 
  message, 
  onRetry, 
  onReset,
  showHome = true
}) => {
  const navigate = useNavigate();
  
  const getErrorMessage = () => {
    if (message) return message;
    
    // Network errors
    if (error?.message?.includes('NetworkError') || 
        error?.message?.includes('Failed to fetch')) {
      return "Unable to connect to the server. Please check your internet connection.";
    }
    
    // API errors
    if (error?.status === 404) {
      return "The requested resource was not found.";
    }
    
    if (error?.status === 500) {
      return "There was a problem with the server. Please try again later.";
    }
    
    // Default error message
    return error?.message || "Something went wrong. Please try again.";
  };
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (onReset) {
      onReset();
      window.location.reload();
    } else {
      window.location.reload();
    }
  };
  
  const handleGoHome = () => {
    if (onReset) onReset();
    navigate('/');
  };
  
  return (
    <div className="error-container">
      <div className="error-icon">
        <AlertTriangle size={48} />
      </div>
      
      <h2 className="error-title">Something went wrong</h2>
      
      <p className="error-message">
        {getErrorMessage()}
      </p>
      
      <div className="error-actions">
        <button 
          className="error-button retry-button" 
          onClick={handleRetry}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
        
        {showHome && (
          <button 
            className="error-button home-button" 
            onClick={handleGoHome}
          >
            <ArrowLeft size={16} />
            Go Home
          </button>
        )}
      </div>
      
      {(process.env.NODE_ENV === 'development' && errorInfo) && (
        <details className="error-details">
          <summary>Error Details</summary>
          <pre>{errorInfo.componentStack}</pre>
        </details>
      )}
    </div>
  );
};

export default ErrorDisplay;