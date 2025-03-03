# cache_middleware.py
import time
from functools import wraps

class CacheManager:
    """Manages caching for different resource types with configurable TTL."""
    
    def __init__(self):
        """Initialize the cache manager."""
        self.caches = {
            'sessions': {
                'data': None,
                'last_sync': 0,
                'ttl': 60,  # Default TTL for sessions (60 seconds)
                'dirty': False  # Flag to indicate if cache needs updating
            },
            'teas': {
                'data': None,
                'last_sync': 0,
                'ttl': 300,  # Default TTL for teas (5 minutes)
                'dirty': False
            },
            'dashboard': {
                'data': None,
                'last_sync': 0,
                'ttl': 120,  # Default TTL for dashboard (2 minutes)
                'dirty': False
            }
        }
    
    def get(self, resource_type, force_refresh=False):
        """Get data from cache if available and not expired."""
        cache = self.caches.get(resource_type)
        if not cache:
            return None
            
        current_time = time.time()
        
        # Use cache if available and not expired and not forced refresh
        if (cache['data'] is not None and 
            not force_refresh and 
            not cache['dirty'] and
            (current_time - cache['last_sync']) < cache['ttl']):
            return cache['data']
            
        return None
    
    def set(self, resource_type, data):
        """Set data in cache and update last sync time."""
        cache = self.caches.get(resource_type)
        if not cache:
            return
            
        cache['data'] = data
        cache['last_sync'] = time.time()
        cache['dirty'] = False
    
    def invalidate(self, resource_type):
        """Mark cache as dirty (needs refresh)."""
        cache = self.caches.get(resource_type)
        if not cache:
            return
            
        cache['dirty'] = True
    
    def set_ttl(self, resource_type, ttl):
        """Set TTL for a resource type."""
        cache = self.caches.get(resource_type)
        if not cache:
            return
            
        cache['ttl'] = ttl

# Create a global instance of the cache manager
cache_manager = CacheManager()

def cached_endpoint(resource_type):
    """Decorator to cache API endpoint results."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get force_refresh from query parameters
            force_refresh = kwargs.get('force_refresh', False)
            
            # Check cache
            cached_data = cache_manager.get(resource_type, force_refresh)
            if cached_data is not None:
                return cached_data
            
            # Execute function if no cache hit
            result = f(*args, **kwargs)
            
            # Store in cache
            cache_manager.set(resource_type, result)
            
            return result
        return decorated_function
    return decorator