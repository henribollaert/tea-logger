// src/components/SessionDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { fetchSessions, updateSession } from '../api';
import './SessionDetails.css';

const SessionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const sessions = await fetchSessions();
        // Convert both to strings for comparison
        const foundSession = sessions.find(s => String(s.id) === String(id));
                    
        if (foundSession) {
          setSession(foundSession);
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
    
    loadSession();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSession(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    
    try {
      const updatedSession = await updateSession(session.id, session);
      if (updatedSession) {
        setMessage('Session updated successfully');
        setSession(updatedSession);
      } else {
        setMessage('Failed to update session');
      }
    } catch (error) {
      console.error('Error updating session:', error);
      setMessage('Error updating session');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-container">
            <button onClick={() => navigate('/')} className="icon-button">
              <ArrowLeft size={24} />
            </button>
            <h1 className="app-title">Session Details</h1>
            <div className="spacer"></div>
          </div>
        </header>
        <div className="main-content">
          <div className="loading-state">Loading session details...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-container">
            <button onClick={() => navigate('/')} className="icon-button">
              <ArrowLeft size={24} />
            </button>
            <h1 className="app-title">Session Details</h1>
            <div className="spacer"></div>
          </div>
        </header>
        <div className="main-content">
          <div className="empty-state">{message || 'Session not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate('/')} className="icon-button">
            <ArrowLeft size={24} />
          </button>
          <h1 className="app-title">Session Details</h1>
          <button 
            onClick={handleSubmit} 
            className="icon-button"
            disabled={isSaving}
          >
            <Save size={24} />
          </button>
        </div>
      </header>
      
      <div className="main-content">
        <form className="session-form" onSubmit={handleSubmit}>
          {message && (
            <div className="form-message">{message}</div>
          )}
          
          <div className="form-group">
            <label htmlFor="tea-name">Tea Name</label>
            <input
              type="text"
              id="tea-name"
              name="tea-name"
              value={session.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Tea Type</label>
            <select
              id="type"
              name="type"
              value={session.type || ''}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">Select a type</option>
              <option value="White">White</option>
              <option value="Green">Green</option>
              <option value="Yellow">Yellow</option>
              <option value="Oolong">Oolong</option>
              <option value="Black">Black</option>
              <option value="Sheng Puer">Sheng Puer</option>
              <option value="Shu Puer">Shu Puer</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="vendor">Vendor</label>
            <input
              type="text"
              id="vendor"
              name="vendor"
              value={session.vendor || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="age">Age/Year</label>
            <input
              type="text"
              id="age"
              name="age"
              value={session.age || ''}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., 2018, 5 years"
            />
          </div>
          
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
          
          <div className="session-timestamp">
            Session started: {new Date(session.timestamp).toLocaleString()}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionDetails;