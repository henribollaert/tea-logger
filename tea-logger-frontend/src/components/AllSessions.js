// src/components/AllSessions.js (with skeleton loading states)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { fetchSessions, deleteSession } from '../api';
import './AllSessions.css';

// Import common components
import SessionCard from './common/SessionCard';
import ConfirmationModal from './common/ConfirmationModal';
import ErrorDisplay from './common/ErrorDisplay';
import { SkeletonSessionList } from './common/Skeleton';

// Import custom hooks
import { useNotification } from '../hooks/useNotification';
import { useModal } from '../hooks/useModal';

const AllSessions = () => {
  const navigate = useNavigate();
  
  // Use custom hooks
  const { notification, showNotification } = useNotification();
  const { isOpen: showDeleteConfirm, modalData: sessionToDelete, openModal, closeModal } = useModal();
  
  // Component state
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        const data = await fetchSessions();
        const sortedData = [...data].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        setSessions(sortedData);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setLoadError(error);
        showNotification('Error loading sessions');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
  }, [showNotification]);

  const handleRetryLoading = useCallback(() => {
    setLoadError(null);
    fetchSessions();
  }, []);

  // Memoize tea types
  const teaTypes = useMemo(() => {
    const types = new Set();
    sessions.forEach(session => {
      if (session.type) types.add(session.type);
    });
    return ['', ...Array.from(types)].sort();
  }, [sessions]);

  // Memoize filtered and sorted sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    
    // Apply type filter
    if (filterType) {
      result = result.filter(session => session.type === filterType);
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(session => 
        session.name.toLowerCase().includes(term) || 
        (session.vendor && session.vendor.toLowerCase().includes(term)) ||
        (session.notes && session.notes.toLowerCase().includes(term))
      );
    }
    
    // Apply sorting
    if (sortBy === 'date-desc') {
      result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortBy === 'date-asc') {
      result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }
    
    return result;
  }, [sessions, searchTerm, filterType, sortBy]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleDeleteClick = useCallback((e, session) => {
    e.stopPropagation(); // Prevent navigating to session details
    openModal(session);
  }, [openModal]);

  const handleDeleteSession = useCallback(async () => {
    if (!sessionToDelete) return;
    
    try {
      await deleteSession(sessionToDelete.id);
      
      // Update sessions list
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
      
      // Show notification
      showNotification('Session deleted successfully');
      closeModal();
    } catch (error) {
      console.error('Error deleting session:', error);
      showNotification('Error deleting session');
    }
  }, [sessionToDelete, closeModal, showNotification]);

  const handleSessionClick = useCallback((session) => {
    navigate(`/session/${session.id}`);
  }, [navigate]);

  // Render different content based on state
  const renderContent = () => {
    if (isLoading) {
      return <SkeletonSessionList count={6} />;
    }
    
    if (loadError) {
      return (
        <ErrorDisplay 
          error={loadError}
          message="We couldn't load your sessions"
          onRetry={handleRetryLoading}
          showHome={false}
        />
      );
    }
    
    if (filteredSessions.length === 0) {
      return (
        <div className="empty-state">
          {searchTerm || filterType 
            ? "No sessions match your filters." 
            : "No tea sessions recorded yet."}
        </div>
      );
    }
    
    return (
      <div className="all-sessions-list">
        {filteredSessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            onSessionClick={handleSessionClick}
            onDeleteClick={handleDeleteClick}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate('/')} className="icon-button">
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-title">All Sessions</h1>
          <div className="spacer"></div>
        </div>
      </header>
      
      <div className="main-content">
        {/* Notification */}
        {notification && (
          <div className="notification">
            {notification}
          </div>
        )}
        
        {/* Filters and Search */}
        <div className="filters-container">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search teas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={clearSearch} 
                className="clear-search"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label htmlFor="tea-type">Type:</label>
              <select 
                id="tea-type" 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="">All Types</option>
                {teaTypes.map(type => (
                  type && <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="sort-by">Sort:</label>
              <select 
                id="sort-by" 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Sessions List with loading states */}
        {renderContent()}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && sessionToDelete && (
        <ConfirmationModal
          title="Delete Session"
          message={`Are you sure you want to delete this session for "${sessionToDelete.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteSession}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default AllSessions;