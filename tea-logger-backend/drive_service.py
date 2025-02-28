import os
import json
import io
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Google Drive API scopes
SCOPES = ['https://www.googleapis.com/auth/drive.file']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'
TEA_SESSIONS_FILE_NAME = 'tea_sessions.json'

def get_drive_service():
    """Get authenticated Google Drive service."""
    creds = None
    
    # Load saved credentials if they exist
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_info(
            json.loads(open(TOKEN_FILE).read()), SCOPES)
            
    # If credentials are invalid or don't exist, authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=8080)
            
        # Save credentials
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
            
    return build('drive', 'v3', credentials=creds)

def find_or_create_tea_sessions_file(service):
    """Find tea sessions file in Google Drive or create if not exists."""
    results = service.files().list(
        q=f"name='{TEA_SESSIONS_FILE_NAME}'",
        spaces='drive',
        fields='files(id, name)'
    ).execute()
    
    files = results.get('files', [])
    
    if not files:
        # Create the file if it doesn't exist
        file_metadata = {
            'name': TEA_SESSIONS_FILE_NAME,
            'mimeType': 'application/json'
        }
        
        # Create an empty array as the initial content
        file_content = io.BytesIO(b'[]')
        media = MediaIoBaseUpload(file_content, mimetype='application/json')
        
        file = service.files().create(
            body=file_metadata,
            media_body=media
        ).execute()
        
        return file['id']
    
    return files[0]['id']

def save_sessions_to_drive(sessions):
    """Save tea sessions to Google Drive."""
    try:
        service = get_drive_service()
        file_id = find_or_create_tea_sessions_file(service)
        
        # Convert sessions to JSON string
        content = json.dumps(sessions)
        file_content = io.BytesIO(content.encode('utf-8'))
        media = MediaIoBaseUpload(file_content, mimetype='application/json')
        
        # Update file content
        service.files().update(
            fileId=file_id,
            media_body=media
        ).execute()
        
        return True
    except Exception as e:
        print(f"Error saving to Google Drive: {e}")
        return False

def load_sessions_from_drive():
    """Load tea sessions from Google Drive."""
    try:
        service = get_drive_service()
        file_id = find_or_create_tea_sessions_file(service)
        
        # Download file content
        response = service.files().get_media(fileId=file_id).execute()
        
        # Parse JSON content
        if response:
            content = response.decode('utf-8')
            return json.loads(content)
        return []
    except Exception as e:
        print(f"Error loading from Google Drive: {e}")
        return []