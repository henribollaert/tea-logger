// src/teaApi.js - Enhanced with error handling and fixed update handling
import { createApiClient } from './utils/apiErrorHandler';

const API_URL = 'http://127.0.0.1:5000/api';

// Create an enhanced API client with automatic retries
const apiClient = createApiClient({
  maxRetries: 3,
  retryDelay: 1000
});

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

// Log detailed information about tea operations for debugging
const logTeaOperation = (operation, tea, result) => {
  console.log(`Tea ${operation} operation:`, {
    tea,
    result,
    success: !!result,
    timestamp: new Date().toISOString()
  });
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
    console.log('Fetching teas from server');
    const response = await fetch(addStorageParam(`${API_URL}/teas`));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch teas: ${response.status}`);
    }
    
    const teas = await response.json();
    console.log('Received teas from server:', teas);
    
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
    console.log(`Fetching tea by ID: ${id}`);
    const response = await fetch(addStorageParam(`${API_URL}/teas/${id}`));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tea by ID: ${response.status}`);
    }
    
    const tea = await response.json();
    console.log('Received tea from server:', tea);
    
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
export const fetchTeaByName = async (name) => {
  if (!name) return null;
  
  try {
    // URL encode the name to handle special characters
    const encodedName = encodeURIComponent(name);
    console.log(`Fetching tea by name: ${name}`);
    
    try {
      const response = await fetch(addStorageParam(`${API_URL}/teas/by-name/${encodedName}`));
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tea not found');
        }
        throw new Error(`Failed to fetch tea by name: ${response.status}`);
      }
      
      const tea = await response.json();
      console.log('Received tea from server:', tea);
      return tea;
    } catch (error) {
      // If 404, try to create a basic tea object
      if (error.message === 'Tea not found') {
        console.log(`Tea not found by name: ${name}, creating new tea`);
        
        // Create a basic tea object
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
      } else {
        throw error; // Re-throw other errors
      }
    }
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
  // Ensure we have required data
  if (!teaData || !teaData.name || !teaData.name.trim()) {
    console.error('Cannot create tea: missing name');
    return null;
  }
  
  try {
    // First check if we already have this tea in the cache
    if (teaCache) {
      const existingTea = teaCache.find(tea => 
        tea.name.toLowerCase() === teaData.name.toLowerCase()
      );
      if (existingTea) {
        console.log('Found existing tea in cache:', existingTea);
        return existingTea;
      }
    }
    
    // Also check localStorage to prevent duplicates
    const localTeas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    const existingLocalTea = localTeas.find(tea => 
      tea.name.toLowerCase() === teaData.name.toLowerCase()
    );
    
    if (existingLocalTea) {
      console.log('Found existing tea in localStorage:', existingLocalTea);
      return existingLocalTea;
    }
    
    // Ensure a vendor is properly normalized and set (convert aliases to full name)
    if (teaData.vendor) {
      teaData.vendor = normalizeVendorName(teaData.vendor);
    }
    
    console.log('Sending create tea request with data:', teaData);
    
    // Generate a new ID that will be used even if server call fails
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a full tea object
    const newTeaData = {
      ...teaData,
      id: tempId,
      created: new Date().toISOString()
    };
    
    // Create tea using the API
    try {
      const response = await fetch(addStorageParam(`${API_URL}/teas`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teaData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create tea: ${response.status}`);
      }
      
      const newTea = await response.json();
      console.log('Created tea response:', newTea);
      
      // Log the operation
      logTeaOperation('create', teaData, newTea);
      
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
      console.error('Error creating tea on server:', error);
      
      // Create tea in local storage as fallback since the server request failed
      console.log('Creating tea in local storage as fallback:', newTeaData);
      
      // Update local cache
      const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
      teas.push(newTeaData);
      localStorage.setItem('teaCollection', JSON.stringify(teas));
      
      // Update the cache
      if (teaCache) {
        teaCache.push(newTeaData);
      }
      
      return newTeaData;
    }
  } catch (error) {
    console.error('Error in createTea:', error);
    
    // Create tea in local storage as a last resort
    const fallbackTea = {
      ...teaData,
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      created: new Date().toISOString()
    };
    
    console.log('Creating fallback tea in localStorage:', fallbackTea);
    
    const teas = JSON.parse(localStorage.getItem('teaCollection') || '[]');
    teas.push(fallbackTea);
    localStorage.setItem('teaCollection', JSON.stringify(teas));
    
    return fallbackTea;
  }
};

// Update a tea
export const updateTea = async (id, teaData) => {
  try {
    // Ensure vendor is properly normalized
    if (teaData.vendor) {
      teaData.vendor = normalizeVendorName(teaData.vendor);
    }
    
    // Make sure the ID is preserved
    const dataToUpdate = {
      ...teaData,
      id: id.toString()
    };
    
    // Log pre-update information
    console.log(`Updating tea ${id} with data:`, dataToUpdate);
    
    // Update tea using the API
    const response = await fetch(addStorageParam(`${API_URL}/teas/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToUpdate),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update tea: ${response.status}`);
    }
    
    const updatedTea = await response.json();
    console.log('Updated tea response:', updatedTea);
    
    // Log the operation
    logTeaOperation('update', dataToUpdate, updatedTea);
    
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
      id: teas[index].id, // Ensure ID doesn't change
      updated: new Date().toISOString()
    };
    
    console.log('Updating tea in local storage:', updatedTea);
    teas[index] = updatedTea;
    localStorage.setItem('teaCollection', JSON.stringify(teas));
    
    return updatedTea;
  }
};

// Delete a tea
export const deleteTea = async (id) => {
  try {
    console.log(`Deleting tea with ID: ${id}`);
    
    // Delete tea using the API
    const response = await fetch(addStorageParam(`${API_URL}/teas/${id}`), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete tea: ${response.status}`);
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

// Normalize vendor names (convert aliases to full name, handle case sensitivity)
export const normalizeVendorName = (vendorName) => {
  if (!vendorName) return '';
  
  // Trim whitespace and normalize case (first letter of each word capitalized)
  const normalizedName = vendorName.trim();
  
  // Check if this is an alias
  const lowercaseName = normalizedName.toLowerCase();
  
  // First check user-defined vendors
  const storedVendors = localStorage.getItem('teaVendors');
  if (storedVendors) {
    try {
      const vendors = JSON.parse(storedVendors);
      
      // Check if this is an exact match for a vendor name
      const exactMatch = vendors.find(v => 
        v.name.toLowerCase() === lowercaseName
      );
      if (exactMatch) return exactMatch.name; // Use the properly cased name
      
      // Check if this is a vendor alias
      for (const vendor of vendors) {
        if (Array.isArray(vendor.aliases)) {
          const isAlias = vendor.aliases.some(alias => 
            alias.toLowerCase() === lowercaseName
          );
          if (isAlias) return vendor.name;
        }
      }
    } catch (error) {
      console.error('Error parsing stored vendors:', error);
    }
  }
  
  // Check against hardcoded known vendors/aliases
  if (KNOWN_VENDORS[lowercaseName]) {
    return KNOWN_VENDORS[lowercaseName];
  }
  
  // If no match found, return the original vendor name (properly cased)
  return normalizedName;
};

// Migrate existing sessions to use the tea collection
export const migrateSessionsToTeaReferences = async (sessions) => {
  // Extract unique teas from sessions
  const uniqueTeas = new Map();
  
  sessions.forEach(session => {
    if (session.name && !uniqueTeas.has(session.name)) {
      uniqueTeas.set(session.name, {
        name: session.name,
        type: session.type || '',
        vendor: session.vendor ? normalizeVendorName(session.vendor) : '',
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

// Helper function for constant KNOWN_VENDORS
const KNOWN_VENDORS = {
  'w2t': 'White2Tea',
  'white2tea': 'White2Tea',
  'crimson': 'Crimson Lotus Tea',
  'clt': 'Crimson Lotus Tea',
  'ys': 'Yunnan Sourcing',
  'yunnansourcing': 'Yunnan Sourcing',
  'bitterleaf': 'Bitterleaf Teas',
  'bt': 'Bitterleaf Teas',
  'tgy': 'Tea from Taiwan',
  'eot': 'Essence of Tea',
  'lp': 'Liquid Proust',
  'teamania': 'Teamania',
};