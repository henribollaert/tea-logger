// src/api.js - Fixed version with improved error handling
import { createApiClient } from './utils/apiErrorHandler';
import { fetchTeaById, fetchTeaByName, createTea, migrateSessionsToTeaReferences } from './teaApi';

const API_URL = 'http://127.0.0.1:5000/api';

// Create an enhanced API client with automatic retries
const apiClient = createApiClient({
  maxRetries: 3,
  retryDelay: 1000,
  onError: (error, { attempt, maxRetries, willRetry }) => {
    console.warn(`API error (attempt ${attempt}/${maxRetries}, ${willRetry ? 'will retry' : 'giving up'}):`, error);
  }
});

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

    // Try to fetch from server using enhanced client
    const url = addStorageParam(`${API_URL}/sessions${forceSync ? '&force_sync=true' : ''}`);
    let sessions = [];
    
    try {
      console.log('Fetching sessions from server');
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }
      
      sessions = await response.json();
      console.log(`Fetched ${sessions.length} sessions from server`);
    } catch (error) {
      console.error('Error fetching from server, falling back to local data:', error);
      // Fallback to local storage
      const cachedSessions = localStorage.getItem('cachedSessions');
      if (cachedSessions) {
        sessions = JSON.parse(cachedSessions);
        console.log(`Using ${sessions.length} cached sessions from localStorage`);
      } else {
        const savedSessions = localStorage.getItem('teaSessions');
        sessions = savedSessions ? JSON.parse(savedSessions) : [];
        console.log(`Using ${sessions.length} saved sessions from localStorage`);
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

    // Try server request
    try {
      const response = await fetch(addStorageParam(`${API_URL}/sessions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      const createdSession = await response.json();
      console.log('Server response:', createdSession);
      
      // Update our cache with the new session
      if (sessionCache) {
        sessionCache = [createdSession, ...sessionCache];
      }
      
      return createdSession;
    } catch (error) {
      console.error('Error creating session on server, storing locally:', error);
      
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
    // Make sure we have a valid ID
    if (!id) {
      console.error('Cannot update session: missing ID');
      return null;
    }
    
    console.log(`Updating session ${id} with:`, sessionData);
    
    // Try server request
    try {
      const response = await fetch(addStorageParam(`${API_URL}/sessions/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.status}`);
      }
      
      const updatedSession = await response.json();
      console.log('Server response:', updatedSession);
      
      // Update cache
      if (sessionCache) {
        sessionCache = sessionCache.map(session => 
          session.id.toString() === id.toString() ? updatedSession : session
        );
      }
      
      return updatedSession;
    } catch (error) {
      console.error('Error updating session on server, updating locally:', error);
      
      // Update local cache
      if (sessionCache) {
        const existingSession = sessionCache.find(s => s.id.toString() === id.toString());
        
        if (!existingSession) {
          console.error(`Session with ID ${id} not found in cache`);
          return null;
        }
        
        const updatedSession = {
          ...existingSession,
          ...sessionData,
          id: existingSession.id,
          updated: new Date().toISOString()
        };
        
        // Replace session in cache
        sessionCache = sessionCache.map(session => 
          session.id.toString() === id.toString() ? updatedSession : session
        );
      }
      
      // Update local storage
      const cachedSessions = localStorage.getItem('cachedSessions');
      if (cachedSessions) {
        let sessions = JSON.parse(cachedSessions);
        const existingSessionIndex = sessions.findIndex(s => s.id.toString() === id.toString());
        
        if (existingSessionIndex !== -1) {
          // Create updated session
          const updatedSession = {
            ...sessions[existingSessionIndex],
            ...sessionData,
            id: sessions[existingSessionIndex].id,
            updated: new Date().toISOString()
          };
          
          // Replace in array
          sessions[existingSessionIndex] = updatedSession;
          localStorage.setItem('cachedSessions', JSON.stringify(sessions));
          
          return updatedSession;
        }
      }
      
      // Return a basic response if all else fails
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
    // Make sure we have a valid ID
    if (!id) {
      console.error('Cannot delete session: missing ID');
      return { success: false };
    }
    
    console.log(`Deleting session ${id}`);
    
    // Try server request
    try {
      const response = await fetch(addStorageParam(`${API_URL}/sessions/${id}`), {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Server response:', result);
      
      // Update cache
      if (sessionCache) {
        sessionCache = sessionCache.filter(session => 
          session.id.toString() !== id.toString()
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting session on server, deleting locally:', error);
      
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
        throw new Error(`Failed to sync: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Sync result:', result);
      
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
        throw new Error(`Failed to get sync status: ${response.status}`);
      }
      
      const status = await response.json();
      return status;
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
        throw new Error(`Failed to set sync interval: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error setting sync interval on server:', error);
      return { success: true, interval: intervalSeconds };
    }
  } catch (error) {
    console.error('Error setting sync interval:', error);
    return { success: false, message: error.message };
  }
};

// Cache for dashboard data
let dashboardCache = null;
let lastDashboardFetchTime = 0;

// Fetch dashboard data (sessions, teas, and stats)
export const fetchDashboardData = async (forceSync = false) => {
  try {
    // Check if we have a recent cache and no force sync requested
    const now = Date.now();
    if (dashboardCache && !forceSync && (now - lastDashboardFetchTime) < 5000) {
      // Use cache if less than 5 seconds since last fetch
      return dashboardCache;
    }
    
    // Get data
    try {
      console.log('Fetching dashboard data from server');
      const response = await fetch(addStorageParam(`${API_URL}/dashboard${forceSync ? '&force_sync=true' : ''}`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dashboard data:', data);
      
      // Update cache
      dashboardCache = data;
      lastDashboardFetchTime = now;
      
      // Update session cache as well for other components
      sessionCache = data.sessions;
      lastFetchTime = now;
      
      // Cache the latest data in localStorage as a fallback
      localStorage.setItem('cachedDashboard', JSON.stringify(data));
      localStorage.setItem('cachedSessions', JSON.stringify(data.sessions));
      
      return data;
    } catch (error) {
      console.error('Error fetching dashboard data from server:', error);
      
      // Try to use the cache first
      if (dashboardCache) {
        return dashboardCache;
      }
      
      // Fall back to localStorage
      const cachedDashboard = localStorage.getItem('cachedDashboard');
      if (cachedDashboard) {
        return JSON.parse(cachedDashboard);
      }
      
      // Last resort: build a response from separate caches
      const cachedSessions = JSON.parse(localStorage.getItem('cachedSessions') || '[]');
      const cachedTeas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
      
      return {
        sessions: cachedSessions,
        teas: cachedTeas,
        teaStats: {},
        recentSessions: cachedSessions.slice(0, 5)
      };
    }
  } catch (error) {
    console.error('Error in fetchDashboardData:', error);
    
    // Fallback to constructing dashboard data from local storage
    const cachedSessions = JSON.parse(localStorage.getItem('cachedSessions') || '[]');
    const cachedTeas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    
    return {
      sessions: cachedSessions,
      teas: cachedTeas,
      teaStats: {},
      recentSessions: cachedSessions.slice(0, 5)
    };
  }
};

// Fetch session details with associated tea
export const fetchSessionDetails = async (sessionId) => {
  if (!sessionId) {
    console.error('Cannot fetch session details: missing ID');
    throw new Error('Missing session ID');
  }
  
  try {
    // Get details
    try {
      console.log(`Fetching session details for ID: ${sessionId}`);
      const response = await fetch(addStorageParam(`${API_URL}/sessions/${sessionId}/details`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session details: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Session details:', data);
      return data;
    } catch (error) {
      console.error('Error fetching session details from server:', error);
      
      // Fall back to manual lookup
      console.log('Falling back to manual lookup');
      const sessions = await fetchSessions();
      const session = sessions.find(s => s.id.toString() === sessionId.toString());
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      let tea = null;
      if (session.teaId) {
        tea = await fetchTeaById(session.teaId);
      } else if (session.name) {
        tea = await fetchTeaByName(session.name);
      }
      
      if (!tea && session.name) {
        tea = {
          id: null,
          name: session.name,
          type: session.type || '',
          vendor: session.vendor || '',
          year: session.age || ''
        };
      }
      
      return { session, tea };
    }
  } catch (error) {
    console.error('Error in fetchSessionDetails:', error);
    throw error;
  }
};