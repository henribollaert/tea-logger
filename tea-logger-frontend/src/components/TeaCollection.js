// src/components/TeaCollection.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Plus } from 'lucide-react';
import { fetchDashboardData } from '../api';
import { updateTea, createTea, deleteTea } from '../teaApi';
import './TeaCollection.css';

// Import our new components
import TeaCard from './common/TeaCard';
import TeaForm from './common/TeaForm';
import ConfirmationModal from './common/ConfirmationModal';

const TeaCollection = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [teas, setTeas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isAddingTea, setIsAddingTea] = useState(false);
  const [editingTeaId, setEditingTeaId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teaToDelete, setTeaToDelete] = useState(null);
  const [notification, setNotification] = useState('');
  const [expandedTea, setExpandedTea] = useState(null);
  const [newTea, setNewTea] = useState({
    id: null,
    name: '',
    type: '',
    vendor: '',
    year: '',
    notes: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dashboardData = await fetchDashboardData();
        
        setSessions(dashboardData.sessions);
        
        const teasWithStats = dashboardData.teas.map(tea => {
          const teaId = tea.id.toString();
          const stats = dashboardData.teaStats[teaId] || {
            sessionCount: 0,
            lastBrewed: null,
            sessionIds: []
          };
          
          const teaSessions = stats.sessionIds
            .map(sessionId => dashboardData.sessions.find(s => s.id.toString() === sessionId.toString()))
            .filter(Boolean);
          
          return {
            ...tea,
            sessionCount: stats.sessionCount,
            lastBrewed: stats.lastBrewed,
            sessions: teaSessions
          };
        });
        
        setTeas(teasWithStats);
        
        // Check for focus tea
        const focusTeaId = localStorage.getItem('focusTeaId');
        const focusTeaName = localStorage.getItem('focusTeaName');
        
        if (focusTeaId) {
          setExpandedTea(focusTeaId);
          localStorage.removeItem('focusTeaId');
        } else if (focusTeaName) {
          const focusTea = teasWithStats.find(t => t.name === focusTeaName);
          if (focusTea) {
            setExpandedTea(focusTea.id);
          }
          localStorage.removeItem('focusTeaName');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Memoize filtered teas to prevent recalculation on every render
  const filteredTeas = useMemo(() => {
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
    
    return result;
  }, [teas, searchTerm, filterType]);

  // Memoize tea types to prevent recalculation
  const teaTypes = useMemo(() => {
    const types = new Set();
    teas.forEach(tea => {
      if (tea.type) types.add(tea.type);
    });
    return ['', ...Array.from(types)].sort();
  }, [teas]);

  // Use callbacks for event handlers
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleTeaChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewTea(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleAddTea = useCallback(async () => {
    if (!newTea.name.trim()) return;
    
    try {
      const createdTea = await createTea({
        name: newTea.name.trim(),
        type: newTea.type,
        vendor: newTea.vendor,
        year: newTea.year,
        notes: newTea.notes
      });
      
      const teaWithStats = {
        ...createdTea,
        sessionCount: 0,
        lastBrewed: null,
        sessions: []
      };
      
      setTeas(prev => [...prev, teaWithStats]);
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
    } catch (error) {
      console.error('Error adding tea:', error);
      setNotification('Error adding tea to collection');
      setTimeout(() => setNotification(''), 3000);
    }
  }, [newTea]);

  const handleEditTea = useCallback((tea) => {
    setEditingTeaId(tea.id);
    setNewTea({
      id: tea.id,
      name: tea.name,
      type: tea.type || '',
      vendor: tea.vendor || '',
      year: tea.year || '',
      notes: tea.notes || ''
    });
  }, []);

  const handleUpdateTea = useCallback(async () => {
    if (!newTea.name.trim() || !editingTeaId) return;
    
    try {
      const updatedTea = await updateTea(editingTeaId, {
        name: newTea.name.trim(),
        type: newTea.type,
        vendor: newTea.vendor,
        year: newTea.year,
        notes: newTea.notes
      });
      
      if (updatedTea) {
        setTeas(prev => prev.map(tea => {
          if (tea.id === editingTeaId) {
            return {
              ...updatedTea,
              sessionCount: tea.sessionCount || 0,
              lastBrewed: tea.lastBrewed,
              sessions: tea.sessions || []
            };
          }
          return tea;
        }));
        
        setEditingTeaId(null);
        setNotification('Tea updated successfully');
        setTimeout(() => {
          setNotification('');
        }, 3000);
        
        // Reset form
        setNewTea({
          id: null,
          name: '',
          type: '',
          vendor: '',
          year: '',
          notes: ''
        });
      } else {
        setNotification('Error updating tea');
        setTimeout(() => {
          setNotification('');
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating tea:', error);
      setNotification('Error updating tea');
      setTimeout(() => {
        setNotification('');
      }, 3000);
    }
  }, [newTea, editingTeaId]);

  const handleCancelEdit = useCallback(() => {
    setEditingTeaId(null);
    setNewTea({
      id: null,
      name: '',
      type: '',
      vendor: '',
      year: '',
      notes: ''
    });
  }, []);

  const handleDeleteClick = useCallback((e, tea) => {
    e.stopPropagation();
    setTeaToDelete(tea);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteTea = useCallback(async () => {
    if (!teaToDelete) return;
    
    try {
      const success = await deleteTea(teaToDelete.id);
      
      if (success) {
        setTeas(prev => prev.filter(tea => tea.id !== teaToDelete.id));
        setShowDeleteConfirm(false);
        setTeaToDelete(null);
        setNotification('Tea deleted from collection');
        setTimeout(() => setNotification(''), 3000);
      } else {
        setNotification('Error deleting tea');
        setTimeout(() => setNotification(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting tea:', error);
      setNotification('Error deleting tea');
      setTimeout(() => setNotification(''), 3000);
    }
  }, [teaToDelete]);

  const toggleSessionHistory = useCallback((teaId) => {
    setExpandedTea(prevId => prevId === teaId ? null : teaId);
  }, []);

  const handleSessionClick = useCallback((session) => {
    navigate(`/session/${session.id}`);
  }, [navigate]);

  const handleTeaCardClick = useCallback((tea) => {
    if (!expandedTea) {
      handleEditTea(tea);
    } else {
      toggleSessionHistory(tea.id);
    }
  }, [expandedTea, handleEditTea, toggleSessionHistory]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate(-1)} className="icon-button">
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            Tea Logger
          </h1>
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
          <TeaForm
            tea={newTea}
            onChange={handleTeaChange}
            onSave={editingTeaId ? handleUpdateTea : handleAddTea}
            onCancel={editingTeaId ? handleCancelEdit : () => setIsAddingTea(false)}
            isEditing={!!editingTeaId}
          />
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
                {teaTypes.map(type => (
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
              <TeaCard
                key={tea.id}
                tea={tea}
                onEditClick={() => handleEditTea(tea)}
                onDeleteClick={handleDeleteClick}
                onSessionHistoryToggle={toggleSessionHistory}
                isExpanded={expandedTea === tea.id}
                onSessionClick={handleSessionClick}
                onTeaCardClick={() => handleTeaCardClick(tea)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && teaToDelete && (
        <ConfirmationModal
          title="Delete Tea"
          message={`Are you sure you want to delete "${teaToDelete.name}" from your collection? This action cannot be undone.`}
          onConfirm={handleDeleteTea}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setTeaToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default TeaCollection;