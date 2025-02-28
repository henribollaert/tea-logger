import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Clock, Menu, X } from 'lucide-react';
import './TeaLogger.css';
import { fetchSessions, createSession, getSyncStatus, forceSync } from '../api';

const TeaLogger = () => {
  const [sessions, setSessions] = useState([]);
  const [currentTea, setCurrentTea] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [recentTeas, setRecentTeas] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load sessions from API
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSessions();
        setSessions(data);
        
        // Extract unique tea names for suggestions
        const teas = data.map(session => session.name);
        const uniqueTeas = [...new Set(teas)];
        setRecentTeas(uniqueTeas.slice(0, 5));
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
  }, []);
  
  // Add this useEffect for background sync
  useEffect(() => {
    // Check sync status on load and periodically
    const checkSyncStatus = async () => {
      try {
        const status = await getSyncStatus();
        setSyncStatus(status);
        
        // If Google Drive is enabled and there are pending changes, sync
        const useGoogleDrive = localStorage.getItem('useGoogleDrive') === 'true';
        if (useGoogleDrive && status.drive_dirty) {
          await forceSync();
          // Refresh sessions after sync
          const sessions = await fetchSessions(true);
          setSessions(sessions);
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
      }
    };
    
    // Check immediately and then every minute
    checkSyncStatus();
    const intervalId = setInterval(checkSyncStatus, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const startNewSession = async () => {
    if (!currentTea.trim()) return;
    
    const newSession = {
      id: Date.now(),
      name: currentTea,
      type: '',
      age: '',
      vendor: '',
      timestamp: new Date().toISOString(),
      notes: '',
    };
    
    // Save to database/API
    try {
      const savedSession = await createSession(newSession);
      
      // Update state
      setSessions([savedSession, ...sessions]);
      setCurrentTea('');
      
      // Update recent teas
      if (!recentTeas.includes(currentTea)) {
        const updatedRecentTeas = [currentTea, ...recentTeas].slice(0, 5);
        setRecentTeas(updatedRecentTeas);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <button onClick={toggleDrawer} className="icon-button">
            {isDrawerOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="app-title">Tea Logger</h1>
          <div className="spacer"></div> {/* Spacer for alignment */}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="main-content">
        {/* Quick Add Bar */}
        <div className="quick-add-container">
          <div className="input-group">
            <div className="input-wrapper">
              <input
                type="text"
                className="text-input"
                placeholder="What tea are you drinking now?"
                value={currentTea}
                onChange={(e) => {
                  setCurrentTea(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onKeyPress={(e) => e.key === 'Enter' && startNewSession()}
                onFocus={() => setShowSuggestions(currentTea.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              
              {/* Tea Suggestions */}
              {showSuggestions && recentTeas.length > 0 && (
                <div className="suggestions-container">
                  {recentTeas
                    .filter(tea => tea.toLowerCase().includes(currentTea.toLowerCase()))
                    .map((tea, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => {
                          setCurrentTea(tea);
                          setShowSuggestions(false);
                        }}
                      >
                        {tea}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={startNewSession}
              className="add-button"
            >
              <PlusCircle size={24} />
            </button>
          </div>
        </div>
        
        {/* Sessions List */}
        <div className="sessions-list">
          <h2 className="section-title">Recent Sessions</h2>
          
          {isLoading ? (
            <div className="loading-state">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              No tea sessions recorded yet. Start by adding one above!
            </div>
          ) : (
            sessions.map(session => (
              <div 
                key={session.id} 
                className="session-card"
                onClick={() => navigate(`/session/${session.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="session-header">
                  <div>
                    <h3 className="session-title">{session.name}</h3>
                    {session.vendor && <p className="session-detail">{session.vendor}</p>}
                    {session.type && <p className="session-detail">{session.type}</p>}
                  </div>
                  <div className="session-timestamp">
                    <Clock size={14} className="timestamp-icon" />
                    {new Date(session.timestamp).toLocaleDateString()}
                  </div>
                </div>
                {session.notes && (
                  <p className="session-notes">{session.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </main>
      
      {/* Sidebar Drawer */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={toggleDrawer}>
          <div 
            className="drawer"
            onClick={e => e.stopPropagation()}
          >
            <div className="drawer-header">
              <h2 className="drawer-title">Menu</h2>
            </div>
            <nav className="drawer-nav">
              <ul className="menu-list">
                <li><a href="/" className="menu-item">Home</a></li>
                <li><a onClick={() => navigate('/sessions')} className="menu-item">All Sessions</a></li>
                <li><a onClick={() => navigate('/collection')} className="menu-item">Tea Collection</a></li>
                <li><a onClick={() => navigate('/settings')} className="menu-item">Settings</a></li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeaLogger;