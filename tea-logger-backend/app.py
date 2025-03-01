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


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# File to store sessions locally
LOCAL_STORAGE_FILE = 'tea_sessions.json'

# Cache for sessions data
sessions_cache = {
    'data': None,
    'last_sync': 0,
    'drive_dirty': False  # Flag to indicate if Google Drive needs updating
}

# Configuration
SYNC_INTERVAL = 60  # Default sync interval in seconds (can be changed by client)

def get_sessions_from_storage(use_drive=False, force_sync=False):
    """Get sessions from either Google Drive or local storage with caching."""
    global sessions_cache
    
    current_time = time.time()
    
    # Use cache if available and not expired
    if (sessions_cache['data'] is not None and 
        not force_sync and 
        (current_time - sessions_cache['last_sync']) < SYNC_INTERVAL):
        return sessions_cache['data']
    
    # Sync with Google Drive if requested
    if use_drive:
        try:
            drive_sessions = load_sessions_from_drive()
            
            # Update cache
            sessions_cache['data'] = drive_sessions
            sessions_cache['last_sync'] = current_time
            sessions_cache['drive_dirty'] = False
            
            # Also update local file as backup
            with open(LOCAL_STORAGE_FILE, 'w') as f:
                json.dump(drive_sessions, f)
                
            return drive_sessions
        except Exception as e:
            print(f"Error loading from Google Drive: {e}")
            # Fall back to local cache or file
    
    # Use local file
    if os.path.exists(LOCAL_STORAGE_FILE):
        with open(LOCAL_STORAGE_FILE, 'r') as f:
            local_sessions = json.load(f)
            
        # Update cache
        sessions_cache['data'] = local_sessions
        sessions_cache['last_sync'] = current_time
        
        return local_sessions
    
    # No data available
    return []

def save_sessions_to_storage(sessions, use_drive=False):
    """Save sessions to either Google Drive or local storage with caching."""
    global sessions_cache
    
    # Update cache
    sessions_cache['data'] = sessions
    
    # Always save to local file
    with open(LOCAL_STORAGE_FILE, 'w') as f:
        json.dump(sessions, f)
    
    # Save to Google Drive if requested
    if use_drive:
        try:
            save_sessions_to_drive(sessions)
            sessions_cache['drive_dirty'] = False
            sessions_cache['last_sync'] = time.time()
            return True
        except Exception as e:
            print(f"Error saving to Google Drive: {e}")
            # Mark cache as dirty (needs sync)
            sessions_cache['drive_dirty'] = True
            return False
    else:
        # If we're not using Drive currently but it's configured, mark as dirty
        if sessions_cache.get('drive_configured', False):
            sessions_cache['drive_dirty'] = True
    
    return True

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get all tea sessions."""
    global SYNC_INTERVAL  # Add this line - declare global before using
    
    use_drive = request.args.get('use_drive', 'false').lower() == 'true'
    force_sync = request.args.get('force_sync', 'false').lower() == 'true'
    sync_interval = int(request.args.get('sync_interval', SYNC_INTERVAL))
    
    # Update the sync interval if provided
    SYNC_INTERVAL = sync_interval
    
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
            
        # Add timestamp if not provided
        if 'timestamp' not in session_data:
            session_data['timestamp'] = datetime.now().isoformat()
            
        # Add unique ID if not provided
        if 'id' not in session_data:
            session_data['id'] = str(int(datetime.now().timestamp() * 1000))
        else:
            # Ensure ID is a string
            session_data['id'] = str(session_data['id'])
            
        # Load existing sessions
        sessions = get_sessions_from_storage(use_drive)
                
        # Add new session
        sessions.append(session_data)
        
        # Save sessions
        save_sessions_to_storage(sessions, use_drive)
        
        return jsonify(session_data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
SESSION_NOT_FOUND =  "Session not found"

@app.route('/api/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get a specific tea session by ID."""
    try:
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        sessions = get_sessions_from_storage(use_drive)
                
        # Find session with matching ID
        for session in sessions:
            if str(session.get('id')) == str(session_id):
                return jsonify(session)
                    
        return jsonify({"error": SESSION_NOT_FOUND}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions/<session_id>', methods=['PUT'])
def update_session(session_id):
    """Update an existing tea session."""
    try:
        session_data = request.json
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        
        sessions = get_sessions_from_storage(use_drive)
            
        # Find and update session
        for i, session in enumerate(sessions):
            if str(session.get('id')) == str(session_id):
                sessions[i] = {**session, **session_data}
                
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
        use_drive = request.args.get('use_drive', 'false').lower() == 'true'
        sessions = get_sessions_from_storage(use_drive)
            
        # Find session index
        session_index = None
        for i, session in enumerate(sessions):
            if str(session.get('id')) == str(session_id):
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
        global sessions_cache
        sessions_cache['data'] = drive_sessions
        sessions_cache['last_sync'] = time.time()
        sessions_cache['drive_dirty'] = False
        
        with open(LOCAL_STORAGE_FILE, 'w') as f:
            json.dump(drive_sessions, f)
        
        return jsonify({"success": True, "message": "Synced with Google Drive successfully"})
    except Exception as e:
        print(f"Error in force_sync: {e}")  # Add detailed logging
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/sync/status', methods=['GET'])
def get_sync_status():
    """Get the current sync status."""
    current_time = time.time()
    time_since_sync = current_time - sessions_cache['last_sync']
    
    return jsonify({
        "last_sync": sessions_cache['last_sync'],
        "time_since_sync": time_since_sync,
        "sync_interval": SYNC_INTERVAL,
        "drive_dirty": sessions_cache.get('drive_dirty', False)
    })

@app.route('/api/sync/interval', methods=['POST'])
def set_sync_interval():
    """Set the synchronization interval."""
    try:
        global SYNC_INTERVAL  # Declare global before using
        data = request.json
        interval = data.get('interval')
        
        if not interval or not isinstance(interval, int) or interval < 0:
            return jsonify({"success": False, "message": "Invalid sync interval"}), 400
        
        SYNC_INTERVAL = interval
        
        return jsonify({
            "success": True, 
            "message": "Sync interval updated", 
            "interval": interval
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
# Add these imports at the top of your app.py file
from tea_service import (
    get_tea_collection, 
    get_tea_by_id, 
    get_tea_by_name, 
    create_tea, 
    update_tea, 
    delete_tea
)

# Add these routes to your Flask app.py
@app.route('/api/teas', methods=['GET'])
def get_teas():
    """Get all teas."""
    teas = get_tea_collection()
    return jsonify(teas)

@app.route('/api/teas', methods=['POST'])
def create_tea_route():
    """Create a new tea."""
    try:
        tea_data = request.json
        
        # Validate required fields
        if not tea_data or 'name' not in tea_data:
            return jsonify({"error": "Tea name is required"}), 400
            
        # Create tea
        new_tea = create_tea(tea_data)
        
        return jsonify(new_tea), 201
    except Exception as e:
        print(f"Error creating tea: {e}")
        return jsonify({"error": str(e)}), 500
    
TEA_NOT_FOUND = "Tea not found"

@app.route('/api/teas/<tea_id>', methods=['GET'])
def get_tea_route(tea_id):
    """Get a specific tea by ID."""
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
        tea_data = request.json
        
        # Validate required fields
        if not tea_data or 'name' not in tea_data:
            return jsonify({"error": "Tea name is required"}), 400
            
        # Update tea
        updated_tea = update_tea(tea_id, tea_data)
        
        if updated_tea:
            return jsonify(updated_tea)
        
        return jsonify({"error": TEA_NOT_FOUND}), 404
    except Exception as e:
        print(f"Error updating tea: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/teas/<tea_id>', methods=['DELETE'])
def delete_tea_route(tea_id):
    """Delete a tea."""
    success = delete_tea(tea_id)
    
    if success:
        return jsonify({"message": "Tea deleted successfully"})
    
    return jsonify({"error": TEA_NOT_FOUND}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)