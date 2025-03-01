// src/teaApi.js
// This file handles the tea collection data separate from sessions

const TEA_STORAGE_KEY = 'teaCollection';

// Initialize the tea collection if it doesn't exist
const initTeaCollection = () => {
  if (!localStorage.getItem(TEA_STORAGE_KEY)) {
    localStorage.setItem(TEA_STORAGE_KEY, JSON.stringify([]));
  }
};

// Get all teas
export const fetchTeas = () => {
  initTeaCollection();
  const teas = localStorage.getItem(TEA_STORAGE_KEY);
  return JSON.parse(teas || '[]');
};

// Get a specific tea by ID
export const fetchTeaById = (id) => {
  const teas = fetchTeas();
  return teas.find(tea => tea.id.toString() === id.toString());
};

// Get a tea by name (for backwards compatibility)
export const fetchTeaByName = (name) => {
  const teas = fetchTeas();
  return teas.find(tea => tea.name.toLowerCase() === name.toLowerCase());
};

// Create a new tea
export const createTea = (teaData) => {
  const teas = fetchTeas();
  
  // Check if tea with this name already exists
  const existingTea = teas.find(t => 
    t.name.toLowerCase() === teaData.name.toLowerCase()
  );
  
  if (existingTea) {
    return existingTea; // Return existing tea if found
  }
  
  // Create new tea with ID
  const newTea = {
    ...teaData,
    id: Date.now().toString(),
    created: new Date().toISOString()
  };
  
  // Add to collection and save
  teas.push(newTea);
  localStorage.setItem(TEA_STORAGE_KEY, JSON.stringify(teas));
  
  return newTea;
};

// Update a tea
export const updateTea = (id, teaData) => {
  const teas = fetchTeas();
  const index = teas.findIndex(tea => tea.id.toString() === id.toString());
  
  if (index === -1) {
    return null; // Tea not found
  }
  
  // Update tea while preserving created date and ID
  const updatedTea = {
    ...teas[index],
    ...teaData,
    id: teas[index].id, // Ensure ID doesn't change
    updated: new Date().toISOString()
  };
  
  teas[index] = updatedTea;
  localStorage.setItem(TEA_STORAGE_KEY, JSON.stringify(teas));
  
  return updatedTea;
};

// Delete a tea
export const deleteTea = (id) => {
  const teas = fetchTeas();
  const filteredTeas = teas.filter(tea => tea.id.toString() !== id.toString());
  
  if (filteredTeas.length === teas.length) {
    return false; // No tea was deleted
  }
  
  localStorage.setItem(TEA_STORAGE_KEY, JSON.stringify(filteredTeas));
  return true;
};

// Migrate existing sessions to use the tea collection
export const migrateSessionsToTeaReferences = (sessions) => {
  // First, extract unique teas from sessions
  const uniqueTeas = new Map();
  
  sessions.forEach(session => {
    if (!uniqueTeas.has(session.name)) {
      uniqueTeas.set(session.name, {
        name: session.name,
        type: session.type || '',
        vendor: session.vendor || '',
        year: session.age || '',
        notes: session.notes || ''
      });
    }
  });
  
  // Create teas in the collection if they don't exist
  const teaMap = new Map(); // Maps tea names to tea IDs
  
  Array.from(uniqueTeas.values()).forEach(tea => {
    const existingTea = fetchTeaByName(tea.name);
    
    if (existingTea) {
      teaMap.set(tea.name, existingTea.id);
    } else {
      const newTea = createTea(tea);
      teaMap.set(tea.name, newTea.id);
    }
  });
  
  // Return the tea map for session updating
  return teaMap;
};