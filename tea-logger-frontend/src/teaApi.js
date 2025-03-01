// src/teaApi.js
// Optimized version with caching and reduced API calls

const API_URL = 'http://127.0.0.1:5000/api';

// Cache for tea data
let teaCache = null;
let lastFetchTime = 0;
const CACHE_EXPIRY = 60000; // 1 minute

// Helper to add storage parameters from the main API
const addStorageParam = (url) => {
  // This is required to maintain compatibility with the storage toggle
  const useGoogleDrive = localStorage.getItem('useGoogleDrive') === 'true';
  const syncInterval = localStorage.getItem('syncInterval') || '600';
  return `${url}${url.includes('?') ? '&' : '?'}use_drive=${useGoogleDrive}&sync_interval=${syncInterval}`;
};

// Fallback to localStorage if the server is unreachable
const fallbackToLocalStorage = (operation) => {
  console.warn(`Falling back to localStorage for ${operation}`);
  
  // Initialize the tea collection if it doesn't exist
  if (!localStorage.getItem('teaCollection')) {
    localStorage.setItem('teaCollection', JSON.stringify([]));
  }
  
  // Return the local collection
  return JSON.parse(localStorage.getItem('teaCollection') || '[]');
};

// Get all teas
export const fetchTeas = async (forceRefresh = false) => {
  // Check if we have a recent cache
  const now = Date.now();
  if (teaCache && !forceRefresh && (now - lastFetchTime) < CACHE_EXPIRY) {
    return teaCache;
  }
  
  try {
    const response = await fetch(addStorageParam(`${API_URL}/teas`));
    
    if (!response.ok) {
      throw new Error('Failed to fetch teas');
    }
    
    const teas = await response.json();
    
    // Update cache
    teaCache = teas;
    lastFetchTime = now;
    
    // Cache teas in localStorage as fallback
    localStorage.setItem('teaCollection', JSON.stringify(teas));
    
    return teas;
  } catch (error) {
    console.error('Error fetching teas:', error);
    
    // Try to use the cache first
    if (teaCache) {
      return teaCache;
    }
    
    return fallbackToLocalStorage('fetchTeas');
  }
};

// Get a specific tea by ID
export const fetchTeaById = async (id) => {
  if (!id) return null;
  
  // Check the cache first
  if (teaCache) {
    const cachedTea = teaCache.find(tea => tea.id.toString() === id.toString());
    if (cachedTea) {
      return cachedTea;
    }
  }
  
  try {
    const response = await fetch(addStorageParam(`${API_URL}/teas/${id}`));
    
    if (response.status === 404) {
      return null; // Tea not found
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch tea');
    }
    
    const tea = await response.json();
    
    // Update the cache if it exists
    if (teaCache) {
      const index = teaCache.findIndex(t => t.id.toString() === id.toString());
      if (index !== -1) {
        teaCache[index] = tea;
      } else {
        teaCache.push(tea);
      }
    }
    
    return tea;
  } catch (error) {
    console.error('Error fetching tea by ID:', error);
    
    // Try to find tea in local storage
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    return teas.find(tea => tea.id.toString() === id.toString());
  }
};

// Get a tea by name (for backwards compatibility)
// Get a tea by name (for backwards compatibility)
export const fetchTeaByName = async (name) => {
  if (!name) return null;
  
  try {
    // URL encode the name to handle special characters
    const encodedName = encodeURIComponent(name);
    const response = await fetch(addStorageParam(`${API_URL}/teas/by-name/${encodedName}`));
    
    if (response.status === 404) {
      console.log(`Tea not found by name: ${name}`);
      // If not found by the exact name, try to create a basic tea object
      // This helps with transitioning to the new system
      const basicTea = {
        name: name,
        type: '',
        vendor: '',
        year: '',
        notes: ''
      };
      
      try {
        // Create the tea in the collection
        console.log(`Creating new tea for: ${name}`);
        const newTea = await createTea(basicTea);
        return newTea;
      } catch (createError) {
        console.error(`Error creating tea for ${name}:`, createError);
        return null;
      }
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch tea by name');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tea by name:', error);
    
    // Try to find tea in local storage
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    const localTea = teas.find(tea => tea.name.toLowerCase() === name.toLowerCase());
    
    if (localTea) {
      return localTea;
    }
    
    // If all else fails, return a basic object
    return {
      id: `local-${Date.now()}`,
      name: name,
      type: '',
      vendor: '',
      year: '',
      notes: ''
    };
  }
};

// Create a new tea
export const createTea = async (teaData) => {
  try {
    // First check if we already have this tea in the cache
    if (teaCache) {
      const existingTea = teaCache.find(tea => tea.name.toLowerCase() === teaData.name.toLowerCase());
      if (existingTea) {
        return existingTea;
      }
    }
    
    const response = await fetch(addStorageParam(`${API_URL}/teas`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teaData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create tea');
    }
    
    const newTea = await response.json();
    
    // Update the cache
    if (teaCache) {
      teaCache.push(newTea);
    } else {
      // Initialize cache if it doesn't exist
      await fetchTeas(true);
    }
    
    // Update local cache
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    teas.push(newTea);
    localStorage.setItem('teaCollection', JSON.stringify(teas));
    
    return newTea;
  } catch (error) {
    console.error('Error creating tea:', error);
    
    // Create tea in local storage as fallback
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    
    // Check if tea with this name already exists
    const existingTea = teas.find(t => t.name.toLowerCase() === teaData.name.toLowerCase());
    
    if (existingTea) {
      return existingTea;
    }
    
    // Create new tea with ID
    const newTea = {
      ...teaData,
      id: Date.now().toString(),
      created: new Date().toISOString()
    };
    
    teas.push(newTea);
    localStorage.setItem('teaCollection', JSON.stringify(teas));
    
    return newTea;
  }
};

// Update a tea
export const updateTea = async (id, teaData) => {
  try {
    const response = await fetch(addStorageParam(`${API_URL}/teas/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teaData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update tea');
    }
    
    const updatedTea = await response.json();
    
    // Update the cache
    if (teaCache) {
      const index = teaCache.findIndex(tea => tea.id.toString() === id.toString());
      if (index !== -1) {
        teaCache[index] = updatedTea;
      }
    }
    
    // Update local cache
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    const index = teas.findIndex(tea => tea.id.toString() === id.toString());
    
    if (index !== -1) {
      teas[index] = updatedTea;
      localStorage.setItem('teaCollection', JSON.stringify(teas));
    }
    
    return updatedTea;
  } catch (error) {
    console.error('Error updating tea:', error);
    
    // Update tea in local storage as fallback
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    const index = teas.findIndex(tea => tea.id.toString() === id.toString());
    
    if (index === -1) {
      return null;
    }
    
    const updatedTea = {
      ...teas[index],
      ...teaData,
      id: teas[index].id,
      updated: new Date().toISOString()
    };
    
    teas[index] = updatedTea;
    localStorage.setItem('teaCollection', JSON.stringify(teas));
    
    return updatedTea;
  }
};

// Delete a tea
export const deleteTea = async (id) => {
  try {
    const response = await fetch(addStorageParam(`${API_URL}/teas/${id}`), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete tea');
    }
    
    // Update the cache
    if (teaCache) {
      teaCache = teaCache.filter(tea => tea.id.toString() !== id.toString());
    }
    
    // Update local cache
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    const filteredTeas = teas.filter(tea => tea.id.toString() !== id.toString());
    localStorage.setItem('teaCollection', JSON.stringify(filteredTeas));
    
    return true;
  } catch (error) {
    console.error('Error deleting tea:', error);
    
    // Delete tea from local storage as fallback
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    const filteredTeas = teas.filter(tea => tea.id.toString() !== id.toString());
    
    if (filteredTeas.length === teas.length) {
      return false;
    }
    
    localStorage.setItem('teaCollection', JSON.stringify(filteredTeas));
    return true;
  }
};

// Migrate existing sessions to use the tea collection
// Migrate existing sessions to use the tea collection
export const migrateSessionsToTeaReferences = async (sessions) => {
  // Extract unique teas from sessions
  const uniqueTeas = new Map();
  
  sessions.forEach(session => {
    if (session.name && !uniqueTeas.has(session.name)) {
      uniqueTeas.set(session.name, {
        name: session.name,
        type: session.type || '',
        vendor: session.vendor || '',
        year: session.age || '',
        notes: ''
      });
    }
  });
  
  // Create teas in the collection if they don't exist
  const teaMap = new Map(); // Maps tea names to tea IDs
  
  // Process teas one by one
  for (const [name, teaData] of uniqueTeas.entries()) {
    try {
      let existingTea = null;
      
      // Try to find by name
      if (name) {
        existingTea = await fetchTeaByName(name);
      }
      
      if (existingTea && existingTea.id) {
        teaMap.set(name, existingTea.id);
      } else {
        // Create new tea
        try {
          const newTea = await createTea(teaData);
          if (newTea && newTea.id) {
            teaMap.set(name, newTea.id);
          } else {
            console.error('Failed to create tea:', teaData);
          }
        } catch (createError) {
          console.error('Error creating tea:', createError);
        }
      }
    } catch (error) {
      console.error(`Error processing tea ${name}:`, error);
    }
  }
  
  console.log('Migration complete - tea map has', teaMap.size, 'entries');
  
  // Return the tea map for session updating
  return teaMap;
};