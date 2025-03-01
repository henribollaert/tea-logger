/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.

// Cache names
const CACHE_NAME = 'tea-logger-cache-v1';
const API_CACHE_NAME = 'tea-logger-api-cache-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheAllowlist = [CACHE_NAME, API_CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});

// Helper function to determine if a request is an API request
const isApiRequest = (request) => {
  return request.url.includes('/api/');
};


// IndexedDB setup for better offline sync
const DB_NAME = 'tea-logger-db';
const STORE_NAME = 'offline-requests';
let db;

// Initialize IndexedDB
const initializeDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(new Error('Failed to open database'));
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create an object store for pending requests
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      store.createIndex('url', 'url', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
  });
};

// Save a request for later sync
const saveRequestForSync = async (request, body) => {
  if (!db) await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const item = {
      url: request.url,
      method: request.method,
      headers: Array.from(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    };
    
    const storeRequest = store.add(item);
    
    storeRequest.onsuccess = () => resolve(true);
    storeRequest.onerror = () => reject(new Error('Failed to store request'));
  });
};

// Retrieve all pending requests
const getPendingRequests = async () => {
  if (!db) await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => resolve(getAllRequest.result);
    getAllRequest.onerror = () => reject(new Error('Failed to get pending requests'));
  });
};

// Remove a processed request
const removePendingRequest = async (id) => {
  if (!db) await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const deleteRequest = store.delete(id);
    
    deleteRequest.onsuccess = () => resolve(true);
    deleteRequest.onerror = () => reject(new Error('Failed to delete request'));
  });
};

// Background sync handler (improved)
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-tea-sessions') {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync all pending requests
const syncPendingRequests = async () => {
  try {
    await initializeDB();
    const pendingRequests = await getPendingRequests();
    
    console.log(`Processing ${pendingRequests.length} pending requests...`);
    
    for (const pendingRequest of pendingRequests) {
      try {
        const response = await fetch(pendingRequest.url, {
          method: pendingRequest.method,
          headers: Object.fromEntries(pendingRequest.headers),
          body: pendingRequest.body
        });
        
        if (response.ok) {
          await removePendingRequest(pendingRequest.id);
          console.log(`Successfully synced request ${pendingRequest.id}`);
        } else {
          console.error(`Failed to sync request ${pendingRequest.id}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error syncing request ${pendingRequest.id}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in syncPendingRequests:', error);
    return false;
  }
};

// Initialize IndexedDB when the service worker activates
self.addEventListener('activate', (event) => {
  event.waitUntil(initializeDB());
});

// Update the fetch handler to use the new IndexedDB storage
self.addEventListener('fetch', (event) => {
  if (isApiRequest(event.request)) {
    // For API requests, use network first, then cache
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Clone the response to store in cache
            const responseToCache = response.clone();
            
            caches.open(API_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(() => {
            // If network fails, try to get from cache
            return caches.match(event.request);
          })
      );
    } else if (event.request.method === 'POST' || event.request.method === 'PUT' || event.request.method === 'DELETE') {
      // For write operations, if offline, store in IndexedDB for later sync
      if (!navigator.onLine) {
        // Clone the request to store it
        const requestClone = event.request.clone();
        
        event.respondWith(
          requestClone.text().then(bodyText => {
            // Store the request for later sync
            saveRequestForSync(requestClone, bodyText).then(() => {
              console.log('Request saved for later sync:', requestClone.url);
              
              // Register a sync when back online (if supported)
              if ('sync' in self.registration) {
                self.registration.sync.register('sync-tea-sessions');
              }
            });
            
            // Return a custom response for offline write operations
            return new Response(JSON.stringify({
              success: true,
              offline: true,
              message: 'Your changes have been saved locally and will sync when you go back online.'
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          })
        );
      } else {
        // Online, just process normally
        return;
      }
    }
  }
});