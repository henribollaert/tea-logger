import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Plus, Edit, Trash, Save } from 'lucide-react';
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
  const [editingTeaId, setEditingTeaId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teaToDelete, setTeaToDelete] = useState(null);
  const [notification, setNotification] = useState('');
  const [newTea, setNewTea] = useState({
    id: null,
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
              id: session.id, // Use the first session's ID as the tea's ID
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
    return ['', ...Array.from(types)].sort();
  };

  const handleTeaChange = (e) => {
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
        id: Date.now(), // Generate a unique ID
        sessionCount: 0,
        lastBrewed: null
      }
    ];
    
    setTeas(updatedTeas);
    setIsAddingTea(false);
    setNotification('Tea added to collection');
    setTimeout(() => setNotification(''), 3000);
    
    // Reset form
    setNewTea({
      id: null,
      name: '',
      type: '',
      vendor: '',
      year: '',
      notes: ''
    });
  };

  const handleEditTea = (tea) => {
    setEditingTeaId(tea.id);
    setNewTea({
      id: tea.id,
      name: tea.name,
      type: tea.type,
      vendor: tea.vendor,
      year: tea.year,
      notes: tea.notes
    });
  };

  const handleUpdateTea = () => {
    if (!newTea.name.trim()) return;
    
    const updatedTeas = teas.map(tea => 
      tea.id === editingTeaId ? 
        { ...tea, ...newTea } : 
        tea
    );
    
    setTeas(updatedTeas);
    setEditingTeaId(null);
    setNotification('Tea updated successfully');
    setTimeout(() => setNotification(''), 3000);
    
    // Reset form
    setNewTea({
      id: null,
      name: '',
      type: '',
      vendor: '',
      year: '',
      notes: ''
    });
  };

  const handleCancelEdit = () => {
    setEditingTeaId(null);
    setNewTea({
      id: null,
      name: '',
      type: '',
      vendor: '',
      year: '',
      notes: ''
    });
  };

  const handleDeleteClick = (tea) => {
    setTeaToDelete(tea);
    setShowDeleteConfirm(true);
  };

  const handleDeleteTea = () => {
    if (!teaToDelete) return;
    
    const updatedTeas = teas.filter(tea => tea.id !== teaToDelete.id);
    setTeas(updatedTeas);
    setShowDeleteConfirm(false);
    setTeaToDelete(null);
    setNotification('Tea deleted from collection');
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate(-1)} className="icon-button">
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-title">Tea Collection</h1>
          <button 
            onClick={() => {
              setIsAddingTea(!isAddingTea);
              setEditingTeaId(null);
            }} 
            className="icon-button"
          >
            {isAddingTea ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>
      </header>
      
      <div className="main-content">
        {/* Notification */}
        {notification && (
          <div className="notification">
            {notification}
          </div>
        )}
      
        {/* Add/Edit Tea Form */}
        {(isAddingTea || editingTeaId) && (
          <div className="tea-form">
            <h3 className="form-title">
              {editingTeaId ? 'Edit Tea' : 'Add New Tea'}
            </h3>
            
            <div className="form-group">
              <label htmlFor="name">Tea Name*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newTea.name}
                onChange={handleTeaChange}
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
                onChange={handleTeaChange}
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
                onChange={handleTeaChange}
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
                onChange={handleTeaChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={newTea.notes}
                onChange={handleTeaChange}
                className="form-textarea"
                rows="3"
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button 
                className="cancel-button"
                onClick={editingTeaId ? handleCancelEdit : () => setIsAddingTea(false)}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={editingTeaId ? handleUpdateTea : handleAddTea}
                disabled={!newTea.name.trim()}
              >
                {editingTeaId ? 'Update Tea' : 'Add Tea'}
              </button>
            </div>
          </div>
        )}
        
        {/* Filters and Search */}
        <div className="filters-container">
          <div className="search-box">
            <Search size={16} className="search-icon" />
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
              <div 
                key={tea.id} 
                className="tea-card"
                onClick={() => handleEditTea(tea)}
              >
                <div className="tea-info">
                  <h3 className="tea-name">{tea.name}</h3>
                  <div className="tea-details">
                    {tea.type && <span className="tea-tag">{tea.type}</span>}
                    {tea.vendor && <span className="tea-tag">{tea.vendor}</span>}
                    {tea.year && <span className="tea-tag">{tea.year}</span>}
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
                    className="action-button delete-button" 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the card click
                      handleDeleteClick(tea);
                    }}
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
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && teaToDelete && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <h3 className="modal-title">Delete Tea</h3>
            <p className="modal-message">
              Are you sure you want to delete "{teaToDelete.name}" from your collection? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTeaToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={handleDeleteTea}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeaCollection;