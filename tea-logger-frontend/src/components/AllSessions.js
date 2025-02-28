import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Search, X } from 'lucide-react';
import { fetchSessions } from '../api';
import './AllSessions.css';

const AllSessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSessions();
        setSessions(data);
        setFilteredSessions(data);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
  }, []);

  useEffect(() => {
    // Filter and sort sessions whenever filters or sort order changes
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
    
    setFilteredSessions(result);
  }, [sessions, searchTerm, filterType, sortBy]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getTeaTypes = () => {
    const types = new Set();
    sessions.forEach(session => {
      if (session.type) types.add(session.type);
    });
    return ['', ...Array.from(types)];
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate('/')} className="icon-button">
            <ArrowLeft size={24} />
          </button>
          <h1 className="app-title">All Sessions</h1>
          <div className="spacer"></div>
        </div>
      </header>
      
      <div className="main-content">
        {/* Filters and Search */}
        <div className="filters-container">
          <div className="search-box">
            <Search size={18} className="search-icon" />
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
                <X size={18} />
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
                {getTeaTypes().map(type => (
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
        
        {/* Sessions List */}
        <div className="all-sessions-list">
          {isLoading ? (
            <div className="loading-state">Loading sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="empty-state">
              {searchTerm || filterType 
                ? "No sessions match your filters." 
                : "No tea sessions recorded yet."}
            </div>
          ) : (
            filteredSessions.map(session => (
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
      </div>
    </div>
  );
};

export default AllSessions;