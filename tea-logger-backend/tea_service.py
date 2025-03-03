# tea_service.py
import json
import os
from datetime import datetime
from models import Tea
from utils import ensure_string_id, is_valid_id

# File to store tea collection
TEA_STORAGE_FILE = 'tea_collection.json'

# Check if we need to migrate from localStorage
def migrate_from_localstorage():
    """Check if we need to migrate tea data from localStorage."""
    if os.path.exists(TEA_STORAGE_FILE) and os.path.getsize(TEA_STORAGE_FILE) > 0:
        # We already have data, no need to migrate
        return
    
    # Check if we have a sessions file
    if not os.path.exists('tea_sessions.json'):
        # No sessions file, so nothing to migrate
        return
    
    # Try to extract teas from sessions
    with open('tea_sessions.json', 'r') as f:
        try:
            sessions = json.load(f)
            
            # Extract unique teas
            teas = {}
            for session in sessions:
                name = session.get('name')
                if name and name not in teas:
                    # Create a Tea object from the session data
                    tea = Tea.from_legacy(session)
                    teas[name] = tea.to_dict()
            
            # Save teas to file
            with open(TEA_STORAGE_FILE, 'w') as tea_file:
                json.dump(list(teas.values()), tea_file)
            
            print(f"Migrated {len(teas)} teas from sessions")
        except json.JSONDecodeError:
            # Problem with the sessions file, create empty teas file
            with open(TEA_STORAGE_FILE, 'w') as tea_file:
                json.dump([], tea_file)

def get_tea_collection():
    """Get all teas from storage."""
    # Check if we need to migrate first
    migrate_from_localstorage()
    
    # Now get the tea collection
    if os.path.exists(TEA_STORAGE_FILE):
        with open(TEA_STORAGE_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    
    # Create empty file if it doesn't exist
    with open(TEA_STORAGE_FILE, 'w') as f:
        json.dump([], f)
    
    return []

def save_tea_collection(teas):
    """Save tea collection to storage."""
    with open(TEA_STORAGE_FILE, 'w') as f:
        json.dump(teas, f)
    return True

def get_tea_by_id(tea_id):
    """Get a specific tea by ID."""
    if not tea_id:
        return None
    
    # Ensure tea_id is a string
    tea_id = ensure_string_id(tea_id)
    
    teas = get_tea_collection()
    for tea in teas:
        if str(tea.get('id')) == tea_id:
            return tea
    return None

def get_tea_by_name(name):
    """Get a tea by name (case-insensitive)."""
    if not name:
        return None
    
    teas = get_tea_collection()
    for tea in teas:
        if tea.get('name', '').lower() == name.lower():
            return tea
    return None

def create_tea(tea_data):
    """Create a new tea in the collection."""
    teas = get_tea_collection()
    
    # Check if tea with this name already exists
    existing_tea = get_tea_by_name(tea_data.get('name'))
    if existing_tea:
        return existing_tea
    
    # Ensure we have created_at
    if 'created' not in tea_data:
        tea_data['created'] = datetime.now().isoformat()
    
    # Add to collection and save
    teas.append(tea_data)
    save_tea_collection(teas)
    
    return tea_data

def update_tea(tea_id, tea_data):
    """Update an existing tea."""
    if not is_valid_id(tea_id):
        return None
    
    tea_id = ensure_string_id(tea_id)
    teas = get_tea_collection()
    
    for i, tea in enumerate(teas):
        if str(tea.get('id')) == tea_id:
            # Update while preserving ID
            updated_tea = {
                **tea,
                **tea_data,
                'id': tea['id'],  # Ensure ID doesn't change
            }
            
            # Ensure we have updated_at
            if 'updated' not in updated_tea:
                updated_tea['updated'] = datetime.now().isoformat()
            
            teas[i] = updated_tea
            save_tea_collection(teas)
            return updated_tea
    
    return None

def delete_tea(tea_id):
    """Delete a tea from the collection."""
    if not is_valid_id(tea_id):
        return False
    
    tea_id = ensure_string_id(tea_id)
    teas = get_tea_collection()
    original_count = len(teas)
    
    filtered_teas = [tea for tea in teas if str(tea.get('id')) != tea_id]
    
    if len(filtered_teas) < original_count:
        save_tea_collection(filtered_teas)
        return True
    
    return False

def get_teas_by_ids(tea_ids):
    """Get multiple teas by their IDs."""
    tea_collection = get_tea_collection()
    
    # Convert all IDs to strings for comparison
    tea_ids = [ensure_string_id(id) for id in tea_ids if id]
    
    # Filter the collection to just the requested teas
    requested_teas = [tea for tea in tea_collection if str(tea.get('id')) in tea_ids]
    
    return requested_teas