# utils.py
import re
import uuid

def is_valid_uuid(uuid_str):
    """Check if a string is a valid UUID."""
    try:
        uuid_obj = uuid.UUID(uuid_str)
        return True
    except (ValueError, AttributeError):
        return False

def is_valid_id(id_str):
    """Check if a string is a valid ID (UUID or legacy timestamp-based ID)."""
    if id_str is None:
        return False
        
    id_str = str(id_str)
    
    if is_valid_uuid(id_str):
        return True
    
    # Legacy timestamp-based IDs (e.g., '1622548800000')
    return bool(re.match(r'^\d+$', id_str))

def ensure_string_id(id_value):
    """Ensure an ID is a string."""
    if id_value is None:
        return None
    return str(id_value)