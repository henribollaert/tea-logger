import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Trash, ExternalLink } from 'lucide-react';
import { fetchSessions, updateSession, deleteSession } from '../api';
import { fetchTeaById } from '../teaApi';
import './SessionDetails.css';

const SessionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [tea, setTea] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadSessionAndTea = async () => {
      setIsLoading(true);
      try {
        // First load the session
        const sessions = await fetchSessions();
        const foundSession = sessions.find(s => String(s.id) === String(id));
                      
        if (foundSession) {
          setSession(foundSession);
          
          // Check if tea was passed in location state
          if (location.state?.tea) {
            setTea(location.state.tea);
          } else if (foundSession.teaId) {
            // Then load the associated tea if there's a teaId
            const teaData = await fetchTeaById(foundSession.teaId);
            setTea(teaData);
          } else {
            // For backward compatibility, use session data 
            setTea({
              id: null,
              name: foundSession.name,
              type: foundSession.type || '',
              vendor: foundSession.vendor || '',
              year: foundSession.age || ''
            });
          }
        } else {
          setMessage('Session not found');
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setMessage('Error loading session details');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessionAndTea();
  }, [id, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Only allow changing notes in the session details
    if (name === 'notes') {
      setSession(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    
    try {
      // Only update the notes field
      const updatedSession = await updateSession(session.id, { notes: session.notes });
      if (updatedSession) {
        setMessage('Session notes updated successfully');
        setSession(updatedSession);
      } else {
        setMessage('Failed to update session');
      }
    } catch (error) {
      console.error('Error updating session:', error);
      setMessage('Error updating session notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setMessage('');
    
    try {
      // Delete the session
      await deleteSession(session.id);
      
      // Navigate back with success message
      navigate('/', { state: { message: 'Session deleted successfully' } });
    } catch (error) {
      console.error('Error deleting session:', error);
      // Even if there's an error, the session is likely deleted from the local cache
      navigate('/', { state: { message: 'Session deleted from local cache' } });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTitleClick = () => {
    // Store the tea name or ID to focus on in collection
    if (tea) {
      if (tea.id) {
        localStorage.setItem('focusTeaId', tea.id);
      } else {
        localStorage.setItem('focusTeaName', tea.name);
      }
      navigate('/collection');
    } else {
      navigate('/collection');
    }
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-container">
            <button onClick={() => navigate(-1)} className="icon-button">
              <ArrowLeft size={24} />
            </button>
            <h1 className="app-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Tea Logger</h1>
            <div className="spacer"></div>
          </div>
        </header>
        <div className="main-content">
          <div className="loading-state">Loading session details...</div>
        </div>
      </div>
    );
  }

  if (!session || !tea) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-container">
            <button onClick={() => navigate(-1)} className="icon-button">
              <ArrowLeft size={24} />
            </button>
            <h1 className="app-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Tea Logger</h1>
            <div className="spacer"></div>
          </div>
        </header>
        <div className="main-content">
          <div className="empty-state">{message || 'Session or tea not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate(-1)} className="icon-button">
            <ArrowLeft size={24} />
          </button>
          <h1 className="app-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Tea Logger</h1>
          <div className="action-buttons">
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="icon-button"
              title="Delete session"
            >
              <Trash size={24} />
            </button>
            <button 
              onClick={handleSubmit} 
              className="icon-button"
              disabled={isSaving}
              title="Save changes"
            >
              <Save size={24} />
            </button>
          </div>
        </div>
      </header>
      
      <div className="main-content">
        <form className="session-form" onSubmit={handleSubmit}>
          {message && (
            <div className="form-message">{message}</div>
          )}
          
          <div className="session-tea-info">
            <div className="tea-header">
              <h2 className="tea-title">
                {tea.name}
                <button
                  className="link-to-tea"
                  onClick={(e) => {
                    e.preventDefault();
                    handleTitleClick();
                  }}
                  title="View in tea collection"
                >
                  <ExternalLink size={16} />
                </button>
              </h2>
              <div className="tea-metadata">
                {tea.vendor && <span className="metadata-item">{tea.vendor}</span>}
                {tea.type && <span className="metadata-item">{tea.type}</span>}
                {tea.year && <span className="metadata-item">{tea.year}</span>}
              </div>
            </div>
            <div className="session-timestamp">
              Brewed on: {new Date(session.timestamp).toLocaleString()}
            </div>
          </div>
          
          <div className="form-divider"></div>
          
          <div className="form-group">
            <label htmlFor="notes">Tasting Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={session.notes || ''}
              onChange={handleChange}
              className="form-textarea"
              rows="4"
              placeholder="Record your impressions, flavors, aromas..."
            ></textarea>
          </div>
          
          <div className="session-actions">
            <button 
              type="submit"
              className="save-button"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <h3 className="modal-title">Delete Session</h3>
            <p className="modal-message">
              Are you sure you want to delete this tea session? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDetails;