import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Plus, Edit, Trash } from 'lucide-react';
import { fetchSessions } from '../api';
import './TeaCollection.css';

const TeaCollection = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [teas, setTeas] = useState([]);
  const [filteredTeas, setFilteredTeas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isAddingTea, setIsAddingTea] = useState(false);
  const [newTea, setNewTea] = useState({
    name: '',
    type: '',
    vendor: '',
    year: '',
    notes: ''
  });

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSessions();
        setSessions(data);
        
        // Extract unique teas from sessions
        const teaMap = new Map();
        
        data.forEach(session => {
          const key = session.name;
          if (!teaMap.has(key)) {
            teaMap.set(key, {
              name: session.name,
              type: session.type || '',
              vendor: session.vendor || '',
              year: session.age || '',
              notes: session.notes || '',
              sessionCount: 1,
              lastBrewed: session.timestamp
            });
          } else {
            const tea = teaMap.get(key);
            tea.sessionCount += 1;
            if (new Date(session.timestamp) > new Date(tea.lastBrewed)) {
              tea.lastBrewed = session.timestamp;
            }
          }
        });
        
        const teaList = Array.from(teaMap.values());
        setTeas(teaList);
        setFilteredTeas(teaList);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
  }, []);

  useEffect(() => {
    // Filter teas based on search and type
    let result = [...teas];
    
    if (filterType) {
      result = result.filter(tea => tea.type === filterType);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(tea => 
        tea.name.toLowerCase().includes(term) || 
        (tea.vendor && tea.vendor.toLowerCase().includes(term))
      );
    }
    
    setFilteredTeas(result);
  }, [teas, searchTerm, filterType]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getTeaTypes = () => {
    const types = new Set();
    teas.forEach(tea => {
      if (tea.type) types.add(tea.type);
    });
    return ['', ...Array.from(types)];
  };

  const handleNewTeaChange = (e) => {
    const { name, value } = e.target;
    setNewTea(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTea = () => {
    if (!newTea.name.trim()) return;
    
    const updatedTeas = [
      ...teas,
      {
        ...newTea,
        sessionCount: 0,
        lastBrewed: null
      }
    ];
    
    setTeas(updatedTeas);
    setIsAddingTea(false);
    setNewTea({
      name: '',
      type: '',
      vendor: '',
      year: '',
      notes: ''
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate('/')} className="icon-button">
            <ArrowLeft size={24} />
          </button>
          <h1 className="app-title">Tea Collection</h1>
          <button 
            onClick={() => setIsAddingTea(!isAddingTea)} 
            className="icon-button"
          >
            {isAddingTea ? <X size={24} /> : <Plus size={24} />}
          </button>
        </div>
      </header>
      
      <div className="main-content">
        {/* Add New Tea Form */}
        {isAddingTea && (
          <div className="add-tea-form">
            <h3 className="form-title">Add New Tea</h3>
            
            <div className="form-group">
              <label htmlFor="name">Tea Name*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newTea.name}
                onChange={handleNewTeaChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="type">Tea Type</label>
              <select
                id="type"
                name="type"
                value={newTea.type}
                onChange={handleNewTeaChange}
                className="form-select"
              >
                <option value="">Select a type</option>
                <option value="White">White</option>
                <option value="Green">Green</option>
                <option value="Yellow">Yellow</option>
                <option value="Oolong">Oolong</option>
                <option value="Black">Black</option>
                <option value="Dark (Puerh)">Dark (Puerh)</option>
                <option value="Herbal">Herbal</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="vendor">Vendor</label>
              <input
                type="text"
                id="vendor"
                name="vendor"
                value={newTea.vendor}
                onChange={handleNewTeaChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="year">Year/Age</label>
              <input
                type="text"
                id="year"
                name="year"
                value={newTea.year}
                onChange={handleNewTeaChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={newTea.notes}
                onChange={handleNewTeaChange}
                className="form-textarea"
                rows="3"
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button 
                className="cancel-button"
                onClick={() => setIsAddingTea(false)}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={handleAddTea}
                disabled={!newTea.name.trim()}
              >
                Add Tea
              </button>
            </div>
          </div>
        )}
        
        {/* Filters and Search */}
        <div className="filters-container">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search your collection..."
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
          </div>
        </div>
        
        {/* Tea Collection List */}
        <div className="tea-collection-list">
          {isLoading ? (
            <div className="loading-state">Loading your collection...</div>
          ) : filteredTeas.length === 0 ? (
            <div className="empty-state">
              {searchTerm || filterType 
                ? "No teas match your filters." 
                : "Your collection is empty. Add some teas!"}
            </div>
          ) : (
            filteredTeas.map(tea => (
              <div key={tea.name} className="tea-card">
                <div className="tea-info">
                  <h3 className="tea-name">{tea.name}</h3>
                  <div className="tea-details">
                    {tea.type && <span className="tea-type">{tea.type}</span>}
                    {tea.vendor && <span className="tea-vendor">{tea.vendor}</span>}
                    {tea.year && <span className="tea-year">{tea.year}</span>}
                  </div>
                  {tea.sessionCount > 0 && (
                    <div className="tea-stats">
                      <span className="session-count">{tea.sessionCount} session{tea.sessionCount !== 1 ? 's' : ''}</span>
                      {tea.lastBrewed && (
                        <span className="last-brewed">
                          Last brewed: {new Date(tea.lastBrewed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  {tea.notes && <p className="tea-notes">{tea.notes}</p>}
                </div>
                <div className="tea-actions">
                  <button 
                    className="action-button" 
                    onClick={() => console.log('Edit tea:', tea.name)}
                    aria-label="Edit tea"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="action-button delete-button" 
                    onClick={() => console.log('Delete tea:', tea.name)}
                    aria-label="Delete tea"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TeaCollection;