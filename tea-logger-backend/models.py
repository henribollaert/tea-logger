# models.py
from datetime import datetime
import uuid

def generate_id():
    """Generate a unique ID for a model."""
    return str(uuid.uuid4())

def format_timestamp(dt=None):
    """Format a datetime as an ISO string."""
    if dt is None:
        dt = datetime.now()
    return dt.isoformat()

class Tea:
    """Represents a tea in the collection."""
    
    @classmethod
    def from_dict(cls, data):
        """Create a Tea object from a dictionary."""
        tea = cls()
        tea.id = data.get('id') or generate_id()
        tea.name = data.get('name', '')
        tea.type = data.get('type', '')
        tea.vendor = data.get('vendor', '')
        tea.year = data.get('year', '')
        tea.notes = data.get('notes', '')
        tea.created = data.get('created') or format_timestamp()
        tea.updated = data.get('updated')
        return tea
    
    def to_dict(self):
        """Convert to a dictionary representation."""
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'vendor': self.vendor,
            'year': self.year,
            'notes': self.notes,
            'created': self.created,
            'updated': self.updated
        }
    
    @classmethod
    def from_legacy(cls, data):
        """Create a Tea object from legacy session data."""
        tea = cls()
        tea.id = data.get('teaId') or generate_id()
        tea.name = data.get('name', '')
        tea.type = data.get('type', '')
        tea.vendor = data.get('vendor', '')
        # Handle legacy 'age' field
        tea.year = data.get('year') or data.get('age', '')
        tea.notes = data.get('notes', '')
        tea.created = data.get('created') or format_timestamp()
        tea.updated = data.get('updated')
        return tea

class Session:
    """Represents a tea session."""
    
    @classmethod
    def from_dict(cls, data):
        """Create a Session object from a dictionary."""
        session = cls()
        session.id = data.get('id') or generate_id()
        session.teaId = data.get('teaId', '')
        session.name = data.get('name', '')
        session.type = data.get('type', '')
        session.vendor = data.get('vendor', '')
        session.year = data.get('year', '')
        session.notes = data.get('notes', '')
        session.timestamp = data.get('timestamp') or format_timestamp()
        session.created = data.get('created') or format_timestamp()
        session.updated = data.get('updated')
        return session
    
    def to_dict(self):
        """Convert to a dictionary representation."""
        return {
            'id': self.id,
            'teaId': self.teaId,
            'name': self.name,
            'type': self.type,
            'vendor': self.vendor,
            'year': self.year,
            'notes': self.notes,
            'timestamp': self.timestamp,
            'created': self.created,
            'updated': self.updated
        }
    
    @classmethod
    def from_legacy(cls, data):
        """Create a Session object from legacy data."""
        session = cls()
        session.id = data.get('id') or generate_id()
        session.teaId = data.get('teaId', '')
        session.name = data.get('name', '')
        session.type = data.get('type', '')
        session.vendor = data.get('vendor', '')
        # Handle legacy 'age' field
        session.year = data.get('year') or data.get('age', '')
        session.notes = data.get('notes', '')
        session.timestamp = data.get('timestamp') or format_timestamp()
        session.created = data.get('created') or format_timestamp()
        session.updated = data.get('updated')
        return session