// src/api.js with tea references
// This is a local API implementation that should be replaced with backend calls

import { fetchTeaById, fetchTeaByName, createTea, migrateSessionsToTeaReferences } from './teaApi';

const API_URL = 'http://127.0.0.1:5000/api';

// Default sync interval (10 minutes in milliseconds)
const DEFAULT_SYNC_INTERVAL = 10 * 60 * 1000;

// Get storage preference from localStorage
const getStoragePreference = () => {
  return localStorage.getItem('useGoogleDrive') === 'true';
};

// Get sync interval from localStorage
const getSyncInterval = () => {
  const interval = localStorage.getItem('syncInterval');
  return interval ? parseInt(interval, 10) : DEFAULT_SYNC_INTERVAL / 1000; // Convert to seconds for backend
};

// Add the storage and sync parameters to API requests
const addStorageParam = (url) => {
  const useDrive = getStoragePreference();
  const syncInterval = getSyncInterval();
  return `${url}${url.includes('?') ? '&' : '?'}use_drive=${useDrive}&sync_interval=${syncInterval}`;
};

// Last time sessions were fetched
let lastFetchTime = 0;
let sessionCache = null;

// Fetch sessions and ensure they reference teas properly
export const fetchSessions = async (forceSync = false) => {
  try {
    // Check if we have a recent cache and no force sync requested
    const now = Date.now();
    if (sessionCache && !forceSync && (now - lastFetchTime) < 5000) {
      // Use cache if less than 5 seconds since last fetch
      return sessionCache;
    }
    
    let sessions = [];
    
    try {
      // Try to fetch from server
      const url = addStorageParam(`${API_URL}/sessions${forceSync ? '&force_sync=true' : ''}`);
      const response = await fetch(url);
      
      if (response.ok) {
        sessions = await response.json();
      } else {
        throw new Error('Failed to fetch sessions');
      }
    } catch (serverError) {
      console.error('Error fetching from server, falling back to local data:', serverError);
      // Fallback to local storage
      const cachedSessions = localStorage.getItem('cachedSessions');
      if (cachedSessions) {
        sessions = JSON.parse(cachedSessions);
      } else {
        const savedSessions = localStorage.getItem('teaSessions');
        sessions = savedSessions ? JSON.parse(savedSessions) : [];
      }
    }
    
    // Ensure sessions reference teas properly
    const updatedSessions = await ensureTeaReferences(sessions);
    
    // Update cache
    sessionCache = updatedSessions;
    lastFetchTime = now;
    
    // Cache the latest data in localStorage as a fallback
    localStorage.setItem('cachedSessions', JSON.stringify(updatedSessions));
    
    return updatedSessions;
  } catch (error) {
    console.error('Error in fetchSessions:', error);
    
    // Multiple fallback mechanisms for offline support
    if (sessionCache) {
      return sessionCache;
    }
    
    const cachedSessions = localStorage.getItem('cachedSessions');
    if (cachedSessions) {
      return JSON.parse(cachedSessions);
    }
    
    const savedSessions = localStorage.getItem('teaSessions');
    return savedSessions ? JSON.parse(savedSessions) : [];
  }
};

// Helper function to ensure sessions reference teas properly
const ensureTeaReferences = async (sessions) => {
  // First, check if we need to migrate
  const needsMigration = sessions.some(session => !session.teaId);
  
  if (needsMigration) {
    try {
      // Create tea references for existing sessions
      // This function should return a Map
      const teaMap = await migrateSessionsToTeaReferences(sessions);
      
      // Ensure teaMap is actually a Map object
      if (teaMap && typeof teaMap.has === 'function') {
        // Update sessions with tea references
        return sessions.map(session => {
          if (!session.teaId && teaMap.has(session.name)) {
            return {
              ...session,
              teaId: teaMap.get(session.name)
            };
          }
          return session;
        });
      } else {
        console.error('Migration returned invalid teaMap:', teaMap);
        return sessions; // Return original sessions if migration failed
      }
    } catch (error) {
      console.error('Error during migration:', error);
      return sessions; // Return original sessions if migration failed
    }
  }
  
  return sessions;
};

// Create a new session with tea reference
// Create a new session with tea reference
export const createSession = async (sessionData) => {
  try {
    console.log('Creating session with data:', sessionData);
    
    // First, ensure the tea exists or create it
    let teaId = sessionData.teaId;
    let teaName = sessionData.name;
    
    if (!teaId && teaName) {
      // Try to find by name
      console.log('Trying to find tea by name:', teaName);
      const existingTea = await fetchTeaByName(teaName);
      
      if (existingTea && existingTea.id) {
        console.log('Found existing tea:', existingTea);
        teaId = existingTea.id;
      } else {
        // Create new tea
        console.log('Creating new tea for session');
        const newTea = await createTea({
          name: teaName,
          type: sessionData.type || '',
          vendor: sessionData.vendor || '',
          year: sessionData.age || '',
          notes: ''  // Session notes shouldn't be stored with the tea
        });
        
        if (newTea && newTea.id) {
          console.log('New tea created:', newTea);
          teaId = newTea.id;
        } else {
          console.error('Failed to create tea, using local ID');
          teaId = `local-${Date.now()}`;
        }
      }
    }
    
    // Prepare the session with tea reference
    const session = { 
      ...sessionData,
      id: sessionData.id || Date.now().toString(),
      teaId: teaId,
      timestamp: sessionData.timestamp || new Date().toISOString()
    };
    
    console.log('Prepared session for API:', session);

    try {
      // Try server request
      const response = await fetch(addStorageParam(`${API_URL}/sessions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session on server: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Server response:', responseData);
      
      // Update our cache with the new session
      if (sessionCache) {
        sessionCache = [responseData, ...sessionCache];
      }
      
      return responseData;
    } catch (serverError) {
      console.error('Error creating session on server, storing locally:', serverError);
      
      // Store in local cache
      if (sessionCache) {
        sessionCache = [session, ...sessionCache];
      }
      
      // Save to local storage as well
      const cachedSessions = localStorage.getItem('cachedSessions');
      let sessions = cachedSessions ? JSON.parse(cachedSessions) : [];
      sessions = [session, ...sessions];
      localStorage.setItem('cachedSessions', JSON.stringify(sessions));
      
      return session;
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return sessionData;
  }
};

// Update an existing session
export const updateSession = async (id, sessionData) => {
  try {
    // Don't need to update the tea reference on session update
    // Session updates should only affect session-specific data
    
    try {
      // Try server request
      const response = await fetch(addStorageParam(`${API_URL}/sessions/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update session on server');
      }
      
      const responseData = await response.json();
      
      // Update cache
      if (sessionCache) {
        sessionCache = sessionCache.map(session => 
          session.id.toString() === id.toString() ? responseData : session
        );
      }
      
      return responseData;
    } catch (serverError) {
      console.error('Error updating session on server, updating locally:', serverError);
      
      // Update local cache
      if (sessionCache) {
        sessionCache = sessionCache.map(session => 
          session.id.toString() === id.toString() ? { ...session, ...sessionData } : session
        );
      }
      
      // Update local storage
      const cachedSessions = localStorage.getItem('cachedSessions');
      if (cachedSessions) {
        let sessions = JSON.parse(cachedSessions);
        sessions = sessions.map(session => 
          session.id.toString() === id.toString() ? { ...session, ...sessionData } : session
        );
        localStorage.setItem('cachedSessions', JSON.stringify(sessions));
      }
      
      return { ...sessionData, id };
    }
  } catch (error) {
    console.error('Error updating session:', error);
    return { ...sessionData, id };
  }
};

// Delete a session
export const deleteSession = async (id) => {
  try {
    try {
      // Try server request
      const response = await fetch(addStorageParam(`${API_URL}/sessions/${id}`), {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete session on server');
      }
      
      const responseData = await response.json();
      
      // Update cache
      if (sessionCache) {
        sessionCache = sessionCache.filter(session => 
          session.id.toString() !== id.toString()
        );
      }
      
      return responseData;
    } catch (serverError) {
      console.error('Error deleting session on server, deleting locally:', serverError);
      
      // Update local cache
      if (sessionCache) {
        sessionCache = sessionCache.filter(session => 
          session.id.toString() !== id.toString()
        );
      }
      
      // Update local storage
      const cachedSessions = localStorage.getItem('cachedSessions');
      if (cachedSessions) {
        let sessions = JSON.parse(cachedSessions);
        sessions = sessions.filter(session => session.id.toString() !== id.toString());
        localStorage.setItem('cachedSessions', JSON.stringify(sessions));
      }
      
      return { success: true };
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: true }; // Assume success for client-side UX
  }
};

// Toggle Google Drive storage
export const toggleStorage = async (useGoogleDrive) => {
  try {
    // Store preference in localStorage
    localStorage.setItem('useGoogleDrive', useGoogleDrive);
    
    try {
      // Force sync if enabled
      if (useGoogleDrive) {
        await forceSync();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error during toggle sync:', error);
      return { success: false, message: error.message };
    }
  } catch (error) {
    console.error('Error toggling storage:', error);
    return { success: false, message: error.message };
  }
};

// Force sync with Google Drive
export const forceSync = async () => {
  try {
    // Only proceed if Google Drive is enabled
    if (!getStoragePreference()) {
      return { success: false, message: 'Google Drive not enabled' };
    }
    
    try {
      // Send force sync request to server
      const response = await fetch(addStorageParam(`${API_URL}/sync`), {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync with server');
      }
      
      const result = await response.json();
      
      // Refresh sessions after sync
      await fetchSessions(true);
      
      return result;
    } catch (error) {
      console.error('Error syncing with server:', error);
      return { success: false, message: error.message };
    }
  } catch (error) {
    console.error('Error in force sync:', error);
    return { success: false, message: error.message };
  }
};

// Get sync status
export const getSyncStatus = async () => {
  try {
    try {
      // Get sync status from server
      const response = await fetch(addStorageParam(`${API_URL}/sync/status`));
      
      if (!response.ok) {
        throw new Error('Failed to get sync status from server');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting sync status from server:', error);
      
      // Return dummy status if server is unavailable
      return {
        last_sync: 0,
        time_since_sync: 0,
        sync_interval: parseInt(getSyncInterval(), 10),
        drive_dirty: false
      };
    }
  } catch (error) {
    console.error('Error in get sync status:', error);
    return {
      last_sync: 0,
      time_since_sync: 0,
      sync_interval: parseInt(getSyncInterval(), 10),
      drive_dirty: false
    };
  }
};

// Set sync interval
export const setSyncInterval = async (intervalSeconds) => {
  try {
    // Store in localStorage
    localStorage.setItem('syncInterval', intervalSeconds.toString());
    
    try {
      // Update on server
      const response = await fetch(addStorageParam(`${API_URL}/sync/interval`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interval: intervalSeconds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set sync interval on server');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error setting sync interval on server:', error);
      return { success: true, interval: intervalSeconds };
    }
  } catch (error) {
    console.error('Error setting sync interval:', error);
    return { success: false, message: error.message };
  }
};