# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import time
from datetime import datetime
from drive_service import save_sessions_to_drive, load_sessions_from_drive
from tea_service import (
    get_tea_collection, 
    get_tea_by_id, 
    get_tea_by_name, 
    create_tea, 
    update_tea, 
    delete_tea
)
from cache_middleware import cache_manager
from models import Tea, Session
from utils import ensure_string_id, is_valid_id

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# File to store sessions locally
LOCAL_STORAGE_FILE = 'tea_sessions.json'

# Configuration
SYNC_INTERVAL = 60  # Default sync interval in seconds (can be changed by client)

def get_sessions_from_storage(use_drive=False, force_sync=False):
    """Get sessions from either Google Drive or local storage with caching."""
    # Check cache first
    cached_sessions = cache_manager.get('sessions', force_sync)
    if cached_sessions is not None:
        return cached_sessions
    
    # Sync with Google Drive if requested
    if use_drive:
        try:
            drive_sessions = load_sessions_from_drive()
            
            # Update cache
            cache_manager.set('sessions', drive_sessions)
            
            # Also update local file as backup
            with open(LOCAL_STORAGE_FILE, 'w') as f:
                json.dump(drive_sessions, f)
                
            return drive_sessions
        except Exception as e:
            print(f"Error loading from Google Drive: {e}")
            # Fall back to local file
    
    # Use local file
    if os.path.exists(LOCAL_STORAGE_FILE):
        with open(LOCAL_STORAGE_FILE, 'r') as f:
            local_sessions = json.load(f)
            
        # Update cache
        cache_manager.set('sessions', local_sessions)
        
        return local_sessions
    
    # No data available
    return []

def save_sessions_to_storage(sessions, use_drive=False):
    """Save sessions to either Google Drive or local storage with caching."""
    # Update cache
    cache_manager.set('sessions', sessions)
    cache_manager.invalidate('dashboard')  # Invalidate dashboard cache
    
    # Always save to local file
    with open(LOCAL_STORAGE_FILE, 'w') as f:
        json.dump(sessions, f)
    
    # Save to Google Drive if requested
    if use_drive:
        try:
            save_sessions_to_drive(sessions)
            return True
        except Exception as e:
            print(f"Error saving to Google Drive: {e}")
            return False
    
    return True

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get all tea sessions."""
    global SYNC_INTERVAL
    
    use_drive = request.args.get('use_drive', 'false').lower() == 'true'
    force_sync = request.args.get('force_sync', 'false').lower() == 'true'
    sync_interval = int(request.args.get('sync_interval', SYNC_INTERVAL))
    
    # Update the sync interval if provided
    SYNC_INTERVAL = sync_interval
    cache_manager.set_ttl('sessions', sync_interval)
    
    sessions = get_sessions_from_storage(use_drive, force_sync)
    return jsonify(sessions)

TEA_NAME_REQUIRED = "Tea name is required"

@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Create a new tea session."""
    try:
        session_data = request.json
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        
        # Validate required fields
        if not session_data or 'name' not in session_data:
            return jsonify({"error": TEA_NAME_REQUIRED}), 400
        
        # Create a Session object from the data
        session = Session.from_dict(session_data)
        
        # Convert back to dictionary for storage
        session_dict = session.to_dict()
        
        # Load existing sessions
        sessions = get_sessions_from_storage(use_drive)
        
        # Add new session
        sessions.append(session_dict)
        
        # Save sessions
        save_sessions_to_storage(sessions, use_drive)
        
        return jsonify(session_dict), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

SESSION_NOT_FOUND = "Session not found"

@app.route('/api/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get a specific tea session by ID."""
    try:
        # Validate ID
        if not is_valid_id(session_id):
            return jsonify({"error": "Invalid session ID"}), 400
            
        session_id = ensure_string_id(session_id)
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        sessions = get_sessions_from_storage(use_drive)
        
        # Find session with matching ID
        for session in sessions:
            if str(session.get('id')) == session_id:
                return jsonify(session)
        
        return jsonify({"error": SESSION_NOT_FOUND}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions/<session_id>', methods=['PUT'])
def update_session(session_id):
    """Update an existing tea session."""
    try:
        # Validate ID
        if not is_valid_id(session_id):
            return jsonify({"error": "Invalid session ID"}), 400
            
        session_id = ensure_string_id(session_id)
        session_data = request.json
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        
        sessions = get_sessions_from_storage(use_drive)
        
        # Find and update session
        for i, session in enumerate(sessions):
            if str(session.get('id')) == session_id:
                # Create a Session object from the existing data
                updated_session = Session.from_dict(session)
                
                # Update with new data
                for key, value in session_data.items():
                    setattr(updated_session, key, value)
                
                # Add updated timestamp
                updated_session.updated = datetime.now().isoformat()
                
                # Convert back to dictionary for storage
                sessions[i] = updated_session.to_dict()
                
                # Save sessions
                save_sessions_to_storage(sessions, use_drive)
                
                return jsonify(sessions[i])
        
        return jsonify({"error": SESSION_NOT_FOUND}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a tea session."""
    try:
        # Validate ID
        if not is_valid_id(session_id):
            return jsonify({"error": "Invalid session ID"}), 400
            
        session_id = ensure_string_id(session_id)
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        sessions = get_sessions_from_storage(use_drive)
        
        # Find session index
        session_index = None
        for i, session in enumerate(sessions):
            if str(session.get('id')) == session_id:
                session_index = i
                break
        
        if session_index is not None:
            # Remove session
            deleted_session = sessions.pop(session_index)
            
            # Save sessions
            save_sessions_to_storage(sessions, use_drive)
            
            return jsonify({"message": "Session deleted", "session": deleted_session})
        
        return jsonify({"error": SESSION_NOT_FOUND}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sync', methods=['POST'])
def force_sync():
    """Force synchronization with Google Drive."""
    try:
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        
        if not use_drive:
            return jsonify({"success": False, "message": "Google Drive not enabled"}), 400
        
        # Force sync from Google Drive
        drive_sessions = load_sessions_from_drive()
        
        # Update cache and local file
        cache_manager.set('sessions', drive_sessions)
        
        with open(LOCAL_STORAGE_FILE, 'w') as f:
            json.dump(drive_sessions, f)
        
        return jsonify({"success": True, "message": "Synced with Google Drive successfully"})
    except Exception as e:
        print(f"Error in force_sync: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/sync/status', methods=['GET'])
def get_sync_status():
    """Get the current sync status."""
    cache = cache_manager.caches.get('sessions', {})
    current_time = time.time()
    last_sync = cache.get('last_sync', 0)
    time_since_sync = current_time - last_sync
    
    return jsonify({
        "last_sync": last_sync,
        "time_since_sync": time_since_sync,
        "sync_interval": SYNC_INTERVAL,
        "drive_dirty": cache.get('dirty', False)
    })

@app.route('/api/sync/interval', methods=['POST'])
def set_sync_interval():
    """Set the synchronization interval."""
    try:
        global SYNC_INTERVAL
        data = request.json
        interval = data.get('interval')
        
        if not interval or not isinstance(interval, int) or interval < 0:
            return jsonify({"success": False, "message": "Invalid sync interval"}), 400
        
        SYNC_INTERVAL = interval
        cache_manager.set_ttl('sessions', interval)
        
        return jsonify({
            "success": True, 
            "message": "Sync interval updated", 
            "interval": interval
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/teas', methods=['GET'])
def get_teas():
    """Get all teas."""
    # Check cache first
    cached_teas = cache_manager.get('teas')
    if cached_teas is not None:
        return jsonify(cached_teas)
        
    teas = get_tea_collection()
    cache_manager.set('teas', teas)
    return jsonify(teas)

@app.route('/api/teas', methods=['POST'])
def create_tea_route():
    """Create a new tea."""
    try:
        tea_data = request.json
        
        # Validate required fields
        if not tea_data or 'name' not in tea_data:
            return jsonify({"error": TEA_NAME_REQUIRED}), 400
        
        # Create a Tea object from the data
        tea = Tea.from_dict(tea_data)
        
        # Create tea using the service
        new_tea = create_tea(tea.to_dict())
        
        # Invalidate caches
        cache_manager.invalidate('teas')
        cache_manager.invalidate('dashboard')
        
        return jsonify(new_tea), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

TEA_NOT_FOUND = "Tea not found"

@app.route('/api/teas/<tea_id>', methods=['GET'])
def get_tea_route(tea_id):
    """Get a specific tea by ID."""
    # Validate ID
    if not is_valid_id(tea_id):
        return jsonify({"error": "Invalid tea ID"}), 400
        
    tea_id = ensure_string_id(tea_id)
    tea = get_tea_by_id(tea_id)
    
    if tea:
        return jsonify(tea)
    
    # If tea not found by ID, try to find by name
    # This is for backward compatibility
    tea = get_tea_by_name(tea_id)
    if tea:
        return jsonify(tea)
    
    return jsonify({"error": TEA_NOT_FOUND}), 404

@app.route('/api/teas/by-name/<name>', methods=['GET'])
def get_tea_by_name_route(name):
    """Get a tea by name."""
    tea = get_tea_by_name(name)
    
    if tea:
        return jsonify(tea)
    
    return jsonify({"error": TEA_NOT_FOUND}), 404

@app.route('/api/teas/<tea_id>', methods=['PUT'])
def update_tea_route(tea_id):
    """Update an existing tea."""
    try:
        # Validate ID
        if not is_valid_id(tea_id):
            return jsonify({"error": "Invalid tea ID"}), 400
            
        tea_id = ensure_string_id(tea_id)
        tea_data = request.json
        
        # Validate required fields
        if not tea_data or 'name' not in tea_data:
            return jsonify({"error": TEA_NAME_REQUIRED}), 400
        
        # Create a Tea object from the data
        tea = Tea.from_dict(tea_data)
        tea.id = tea_id  # Ensure ID doesn't change
        tea.updated = datetime.now().isoformat()
        
        # Update tea using the service
        updated_tea = update_tea(tea_id, tea.to_dict())
        
        # Invalidate caches
        cache_manager.invalidate('teas')
        cache_manager.invalidate('dashboard')
        
        if updated_tea:
            return jsonify(updated_tea)
        
        return jsonify({"error": TEA_NOT_FOUND}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/teas/<tea_id>', methods=['DELETE'])
def delete_tea_route(tea_id):
    """Delete a tea."""
    # Validate ID
    if not is_valid_id(tea_id):
        return jsonify({"error": "Invalid tea ID"}), 400
        
    tea_id = ensure_string_id(tea_id)
    success = delete_tea(tea_id)
    
    # Invalidate caches
    cache_manager.invalidate('teas')
    cache_manager.invalidate('dashboard')
    
    if success:
        return jsonify({"message": "Tea deleted successfully"})
    
    return jsonify({"error": TEA_NOT_FOUND}), 404

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    """Get combined sessions and teas data for the dashboard view."""
    try:
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        force_sync = request.args.get('force_sync', 'false').lower() == 'true'
        
        # Check cache first
        if not force_sync:
            cached_dashboard = cache_manager.get('dashboard')
            if cached_dashboard is not None:
                return jsonify(cached_dashboard)
        
        # Get sessions and teas
        sessions = get_sessions_from_storage(use_drive, force_sync)
        teas = get_tea_collection()
        
        # Calculate additional stats
        tea_stats = {}
        for tea in teas:
            tea_id = str(tea['id'])
            tea_sessions = [s for s in sessions if str(s.get('teaId')) == tea_id or 
                           (not s.get('teaId') and s.get('name') == tea.get('name'))]
            
            # Sort sessions by timestamp (newest first)
            tea_sessions.sort(key=lambda s: s.get('timestamp', ''), reverse=True)
            
            tea_stats[tea_id] = {
                'sessionCount': len(tea_sessions),
                'lastBrewed': tea_sessions[0]['timestamp'] if tea_sessions else None,
                'sessionIds': [s['id'] for s in tea_sessions]
            }
        
        # Get recent sessions
        recent_sessions = sorted(sessions, 
                               key=lambda s: s.get('timestamp', ''), 
                               reverse=True)[:5]
        
        # Create the dashboard data
        dashboard_data = {
            'sessions': sessions,
            'teas': teas,
            'teaStats': tea_stats,
            'recentSessions': recent_sessions
        }
        
        # Cache the dashboard data
        cache_manager.set('dashboard', dashboard_data)
        
        return jsonify(dashboard_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions/<session_id>/details', methods=['GET'])
def get_session_details(session_id):
    """Get a session and its associated tea in a single request."""
    try:
        # Validate ID
        if not is_valid_id(session_id):
            return jsonify({"error": "Invalid session ID"}), 400
            
        session_id = ensure_string_id(session_id)
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        sessions = get_sessions_from_storage(use_drive)
        
        # Find the session
        session = None
        for s in sessions:
            if str(s.get('id')) == session_id:
                session = s
                break
        
        if not session:
            return jsonify({"error": "Session not found"}), 404
        
        # Get the associated tea
        tea = None
        if session.get('teaId'):
            tea = get_tea_by_id(session.get('teaId'))
        elif session.get('name'):
            tea = get_tea_by_name(session.get('name'))
        
        if not tea and session.get('name'):
            # Create a basic tea object from session data
            tea = {
                'id': None,
                'name': session.get('name'),
                'type': session.get('type', ''),
                'vendor': session.get('vendor', ''),
                'year': session.get('age', '') or session.get('year', '')
            }
        
        return jsonify({
            'session': session,
            'tea': tea
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)