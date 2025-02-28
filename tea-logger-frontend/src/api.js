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

export const fetchSessions = async (forceSync = false) => {
  try {
    // Check if we have a recent cache and no force sync requested
    const now = Date.now();
    if (sessionCache && !forceSync && (now - lastFetchTime) < 5000) {
      // Use cache if less than 5 seconds since last fetch
      return sessionCache;
    }
    
    const url = addStorageParam(`${API_URL}/sessions${forceSync ? '&force_sync=true' : ''}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    
    const data = await response.json();
    
    // Update cache
    sessionCache = data;
    lastFetchTime = now;
    
    // Cache the latest data in localStorage as a fallback
    localStorage.setItem('cachedSessions', JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    
    // If there's a cache, use it
    if (sessionCache) {
      return sessionCache;
    }
    
    // Otherwise try to get from localStorage cache
    const cachedSessions = localStorage.getItem('cachedSessions');
    if (cachedSessions) {
      return JSON.parse(cachedSessions);
    }
    
    // If no cache, try the local teaSessions
    const savedSessions = localStorage.getItem('teaSessions');
    return savedSessions ? JSON.parse(savedSessions) : [];
  }
};

export const createSession = async (sessionData) => {
  try {
    // Make sure ID is treated as a string consistently
    const session = { 
      ...sessionData,
      id: sessionData.id.toString() 
    };

    const response = await fetch(addStorageParam(`${API_URL}/sessions`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    
    const responseData = await response.json();
    
    // Update our cache with the new session
    if (sessionCache) {
      sessionCache = [responseData, ...sessionCache];
    }
    
    return responseData;
  } catch (error) {
    console.error('Error creating session:', error);
    
    // Store in local cache
    if (sessionCache) {
      sessionCache = [sessionData, ...sessionCache];
    }
    
    return sessionData;
  }
};

export const updateSession = async (id, sessionData) => {
  try {
    const response = await fetch(addStorageParam(`${API_URL}/sessions/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    
    const responseData = await response.json();
    
    // Update cache
    if (sessionCache) {
      sessionCache = sessionCache.map(session => 
        session.id.toString() === id.toString() ? responseData : session
      );
    }
    
    return responseData;
  } catch (error) {
    console.error('Error updating session:', error);
    
    // Update local cache
    if (sessionCache) {
      sessionCache = sessionCache.map(session => 
        session.id.toString() === id.toString() ? { ...session, ...sessionData } : session
      );
    }
    
    return { ...sessionData, id };
  }
};

export const deleteSession = async (id) => {
  try {
    const response = await fetch(addStorageParam(`${API_URL}/sessions/${id}`), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
    
    const responseData = await response.json();
    
    // Update cache
    if (sessionCache) {
      sessionCache = sessionCache.filter(session => 
        session.id.toString() !== id.toString()
      );
    }
    
    return responseData;
  } catch (error) {
    console.error('Error deleting session:', error);
    
    // Update local cache
    if (sessionCache) {
      sessionCache = sessionCache.filter(session => 
        session.id.toString() !== id.toString()
      );
    }
    
    return { success: true };
  }
};

export const toggleStorage = async (useDrive) => {
  try {
    const response = await fetch(`${API_URL}/storage/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ use_drive: useDrive }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to toggle storage');
    }
    
    // Update local preference
    localStorage.setItem('useGoogleDrive', useDrive.toString());
    
    // Invalidate cache to force reload
    sessionCache = null;
    
    return await response.json();
  } catch (error) {
    console.error('Error toggling storage:', error);
    return null;
  }
};

export const forceSync = async () => {
  try {
    const useDrive = getStoragePreference();
    
    // Don't attempt to sync if Google Drive is not enabled
    if (!useDrive) {
      return { 
        success: false, 
        message: "Google Drive is not enabled. Please enable it in settings first." 
      };
    }
    
    const response = await fetch(addStorageParam(`${API_URL}/sync`), {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    // Invalidate cache to force reload
    sessionCache = null;
    
    return await response.json();
  } catch (error) {
    console.error('Error syncing with Google Drive:', error);
    return { 
      success: false, 
      message: error.message || 'Network error. Make sure the backend server is running.'
    };
  }
};

export const getSyncStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/sync/status`);
    
    if (!response.ok) {
      throw new Error('Failed to get sync status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting sync status:', error);
    return { 
      last_sync: 0,
      time_since_sync: 0,
      sync_interval: getSyncInterval(),
      drive_dirty: false
    };
  }
};

export const setSyncInterval = async (intervalSeconds) => {
  try {
    const response = await fetch(`${API_URL}/sync/interval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ interval: intervalSeconds }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to set sync interval');
    }
    
    // Save to localStorage
    localStorage.setItem('syncInterval', intervalSeconds.toString());
    
    return await response.json();
  } catch (error) {
    console.error('Error setting sync interval:', error);
    return { success: false, message: error.message };
  }
};