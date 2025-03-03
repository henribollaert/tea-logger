// src/hooks/useNotification.js
import { useState, useCallback } from 'react';

export function useNotification(duration = 3000) {
  const [notification, setNotificationText] = useState('');
  
  const showNotification = useCallback((message) => {
    setNotificationText(message);
    
    if (duration > 0) {
      setTimeout(() => {
        setNotificationText('');
      }, duration);
    }
  }, [duration]);
  
  const clearNotification = useCallback(() => {
    setNotificationText('');
  }, []);
  
  return {
    notification,
    showNotification,
    clearNotification
  };
}