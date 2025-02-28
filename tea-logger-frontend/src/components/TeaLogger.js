import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, Clock, Menu, X } from 'lucide-react';
import './TeaLogger.css';
import { fetchSessions, createSession, getSyncStatus, forceSync } from '../api';

// Known vendors and their abbreviations
const KNOWN_VENDORS = {
  'w2t': 'White2Tea',
  'white2tea': 'White2Tea',
  'crimson': 'Crimson Lotus Tea',
  'clt': 'Crimson Lotus Tea',
  'ys': 'Yunnan Sourcing',
  'yunnansourcing': 'Yunnan Sourcing',
  'bitterleaf': 'Bitterleaf Teas',
  'bt': 'Bitterleaf Teas',
  'tgy': 'Tea from Taiwan',
  'eot': 'Essence of Tea',
  'lp': 'Liquid Proust',
  'teamania': 'Teamania',
};

const TeaLogger = () => {
  const [sessions, setSessions] = useState([]);
  const [currentTea, setCurrentTea] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [recentTeas, setRecentTeas] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  const [notification, setNotification] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for notifications from other components
    if (location.state?.message) {
      setNotification(location.state.message);
      // Clear the location state
      window.history.replaceState({}, document.title);
      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setNotification('');
      }, 3000);
    }

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
  }, [location.state]);
  
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

  // Function to parse natural language input
  const parseTeaInput = (input) => {
    const result = {
      name: '',
      vendor: '',
      age: ''
    };

    // Break input into tokens
    const tokens = input.trim().split(/\s+/);
    
    // Check for known vendors at the beginning
    if (tokens.length > 0) {
      const firstToken = tokens[0].toLowerCase();
      if (KNOWN_VENDORS[firstToken]) {
        result.vendor = KNOWN_VENDORS[firstToken];
        tokens.shift(); // Remove the vendor token
      }
    }
    
    // Check for year at the end (4 digit number or 2 digit year prefixed with ')
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      if (/^(19|20)\d{2}$/.test(lastToken) || /^'\d{2}$/.test(lastToken)) {
        result.age = lastToken.replace(/^'/, '20'); // Convert '19 to 2019
        tokens.pop(); // Remove the year token
      }
    }
    
    // The rest is the tea name
    result.name = tokens.join(' ');
    
    return result;
  };

  const startNewSession = async () => {
    if (!currentTea.trim()) return;
    
    // Parse the input
    const parsedInput = parseTeaInput(currentTea);
    
    const newSession = {
      id: Date.now(),
      name: parsedInput.name || currentTea, // Use parsed name or original input if parsing failed
      type: '',
      age: parsedInput.age || '',
      vendor: parsedInput.vendor || '',
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
      if (!recentTeas.includes(newSession.name)) {
        const updatedRecentTeas = [newSession.name, ...recentTeas].slice(0, 5);
        setRecentTeas(updatedRecentTeas);
      }
      
      // Show notification
      setNotification('Tea session added successfully');
      setTimeout(() => {
        setNotification('');
      }, 3000);
    } catch (error) {
      console.error('Error creating session:', error);
      setNotification('Error adding tea session');
      setTimeout(() => {
        setNotification('');
      }, 3000);
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
        {/* Notification */}
        {notification && (
          <div className="notification">
            {notification}
          </div>
        )}
        
        {/* Quick Add Bar */}
        <div className="quick-add-container">
          <div className="input-group">
            <div className="input-wrapper">
              <input
                type="text"
                className="text-input"
                placeholder="What tea are you drinking now? (e.g. w2t Hot Brandy 2019)"
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