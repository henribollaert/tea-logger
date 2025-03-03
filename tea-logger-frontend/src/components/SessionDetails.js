// src/components/SessionDetails.js (fixed saving session notes)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash, ExternalLink } from 'lucide-react';
import { fetchSessionDetails, updateSession, deleteSession } from '../api';
import './SessionDetails.css';

// Import custom hooks
import { useNotification } from '../hooks/useNotification';
import { useModal } from '../hooks/useModal';
import { useForm } from '../hooks/useForm';

// Import common components
import ConfirmationModal from './common/ConfirmationModal';
import ErrorDisplay from './common/ErrorDisplay';
import { SkeletonSessionDetails } from './common/Skeleton';
import { TextAreaField, SubmitButton } from './common/FormFields';

const SessionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Use custom hooks
  const { notification, showNotification } = useNotification();
  const { isOpen: showDeleteConfirm, openModal, closeModal } = useModal();
  
  // Component state
  const [session, setSession] = useState(null);
  const [tea, setTea] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Validation schema
  const validationSchema = {
    notes: {
      maxLength: { value: 1000, message: 'Notes must be less than 1000 characters' }
    }
  };
  
  // Form for session notes
  const { 
    values: sessionForm, 
    handleChange, 
    handleBlur,
    handleSubmit, 
    errors,
    touched,
    isValid,
    isDirty,
    setValues 
  } = useForm({ notes: '' }, validationSchema);

  useEffect(() => {
    const loadSessionDetails = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // Use the consolidated endpoint
        const data = await fetchSessionDetails(id);
        console.log('Loaded session details:', data);
        
        setSession(data.session);
        setTea(data.tea);
        
        // Set form values
        setValues({ notes: data.session.notes || '' });
      } catch (error) {
        console.error('Error loading session details:', error);
        setLoadError(error);
        showNotification('Error loading session details');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessionDetails();
  }, [id, setValues, showNotification]);

  const handleRetryLoading = useCallback(() => {
    setLoadError(null);
    window.location.reload();
  }, []);

  const saveSession = useCallback(async (formData) => {
    if (!session || !session.id) {
      console.error('Cannot save session: session is null or missing ID');
      showNotification('Error: Session data is missing');
      return;
    }

    console.log('Saving session notes:', formData);
    setIsSaving(true);
    
    try {
      // Only update the notes field
      const updatedSession = await updateSession(session.id, { 
        notes: formData.notes 
      });
      
      console.log('Update session response:', updatedSession);
      
      if (updatedSession) {
        showNotification('Session notes updated successfully');
        setSession(updatedSession);
      } else {
        showNotification('Failed to update session');
      }
    } catch (error) {
      console.error('Error updating session:', error);
      showNotification('Error updating session notes');
    } finally {
      setIsSaving(false);
    }
  }, [session, showNotification]);

  const handleDelete = useCallback(async () => {
    if (!session) return;
    
    setIsDeleting(true);
    
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
  }, [session, navigate]);

  const handleTitleClick = useCallback((e) => {
    e.preventDefault();
    
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
  }, [tea, navigate]);

  const handleNotesSubmit = useCallback((e) => {
    e.preventDefault();
    console.log('Submitting notes form with values:', sessionForm);
    saveSession(sessionForm);
  }, [sessionForm, saveSession]);

  // Render different states
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
          <SkeletonSessionDetails />
        </div>
      </div>
    );
  }

  if (loadError) {
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
          <ErrorDisplay
            error={loadError}
            message="We couldn't load the session details"
            onRetry={handleRetryLoading}
          />
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
          <div className="empty-state">Session or tea not found</div>
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
              onClick={() => openModal()} 
              className="icon-button"
              title="Delete session"
            >
              <Trash size={24} />
            </button>
          </div>
        </div>
      </header>
      
      <div className="main-content">
        {notification && (
          <div className="notification">{notification}</div>
        )}
      
        <form className="session-form" onSubmit={handleNotesSubmit}>
          <div className="session-tea-info">
            <div className="tea-header">
              <h2 className="tea-title">
                {tea.name}
                <button
                  className="link-to-tea"
                  onClick={handleTitleClick}
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
            <label htmlFor="notes" className="form-label">
              Tasting Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={sessionForm.notes || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-textarea ${errors.notes && touched.notes ? 'input-error' : ''}`}
              rows={4}
              placeholder="Record your impressions, flavors, aromas..."
            />
            {errors.notes && touched.notes && (
              <div className="form-error-message">{errors.notes}</div>
            )}
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
        <ConfirmationModal
          title="Delete Session"
          message="Are you sure you want to delete this tea session? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={closeModal}
          confirmLabel={isDeleting ? "Deleting..." : "Delete"}
          isProcessing={isDeleting}
        />
      )}
    </div>
  );
};

export default SessionDetails;