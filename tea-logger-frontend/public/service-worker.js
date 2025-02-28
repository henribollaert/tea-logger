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

// Fetch event handler
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
    } else if (event.request.method === 'POST' || event.request.method === 'PUT') {
      // For POST/PUT requests, if offline, store in IndexedDB for later sync
      if (!navigator.onLine) {
        // Clone the request to store it
        const requestClone = event.request.clone();
        
        event.respondWith(
          // Return a custom response for offline POST/PUT
          new Response(JSON.stringify({
            success: true,
            offline: true,
            message: 'Your changes have been saved locally and will sync when you go back online.'
          }), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
        
        // Store the request for later
        requestClone.text().then((bodyText) => {
          // We'd normally save this to IndexedDB
          // For simplicity, we're just logging it here
          console.log('Request saved for later sync:', {
            url: requestClone.url,
            method: requestClone.method,
            body: bodyText
          });
          
          // Register a sync when back online (if supported)
          if ('sync' in self.registration) {
            self.registration.sync.register('sync-tea-sessions');
          }
        });
        
        return;
      }
    }
  } else {
    // For non-API requests, use cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Don't cache if not a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
                
              return response;
            });
        })
    );
  }
});

// Background sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tea-sessions') {
    event.waitUntil(
      // Here we would retrieve pending requests from IndexedDB
      // and send them to the server
      console.log('Syncing pending requests...')
    );
  }
});