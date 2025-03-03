// src/components/TeaCollection.js (with skeleton loading states)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Plus } from 'lucide-react';
import { fetchDashboardData } from '../api';
import { updateTea, createTea, deleteTea } from '../teaApi';
import './TeaCollection.css';

// Import common components
import TeaCard from './common/TeaCard';
import TeaForm from './common/TeaForm';
import ConfirmationModal from './common/ConfirmationModal';
import ErrorDisplay from './common/ErrorDisplay';
import { SkeletonTeaList } from './common/Skeleton';

// Import custom hooks
import { useNotification } from '../hooks/useNotification';
import { useModal } from '../hooks/useModal';
import { useForm } from '../hooks/useForm';

const TeaCollection = () => {
  const navigate = useNavigate();
  
  // Use custom hooks
  const { notification, showNotification } = useNotification();
  const { isOpen: showDeleteConfirm, modalData: teaToDelete, openModal, closeModal } = useModal();
  
  // Initial form state
  const initialTea = {
    id: null,
    name: '',
    type: '',
    vendor: '',
    year: '',
    notes: ''
  };
  
  // Form hook for tea form
  const { 
    values: newTea, 
    handleChange: handleTeaChange, 
    reset: resetTeaForm,
    setValues: setNewTea 
  } = useForm(initialTea);
  
  // Component state
  const [sessions, setSessions] = useState([]);
  const [teas, setTeas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isAddingTea, setIsAddingTea] = useState(false);
  const [editingTeaId, setEditingTeaId] = useState(null);
  const [expandedTea, setExpandedTea] = useState(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      
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
        setLoadError(error);
        showNotification('Error loading tea collection');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [showNotification]);

  // Handle retry loading
  const handleRetryLoading = useCallback(() => {
    setLoadError(null);
    fetchDashboardData();
  }, []);

  // Memoize filtered teas
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

  // Memoize tea types
  const teaTypes = useMemo(() => {
    const types = new Set();
    teas.forEach(tea => {
      if (tea.type) types.add(tea.type);
    });
    return ['', ...Array.from(types)].sort();
  }, [teas]);

  // Event handlers
  const clearSearch = useCallback(() => {
    setSearchTerm('');
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
      showNotification('Tea added to collection');
      resetTeaForm();
    } catch (error) {
      console.error('Error adding tea:', error);
      showNotification('Error adding tea to collection');
    }
  }, [newTea, showNotification, resetTeaForm]);

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
  }, [setNewTea]);

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
        showNotification('Tea updated successfully');
        resetTeaForm();
      } else {
        showNotification('Error updating tea');
      }
    } catch (error) {
      console.error('Error updating tea:', error);
      showNotification('Error updating tea');
    }
  }, [newTea, editingTeaId, showNotification, resetTeaForm]);

  const handleCancelEdit = useCallback(() => {
    setEditingTeaId(null);
    resetTeaForm();
  }, [resetTeaForm]);

  const handleDeleteClick = useCallback((e, tea) => {
    e.stopPropagation();
    openModal(tea);
  }, [openModal]);

  const handleDeleteTea = useCallback(async () => {
    if (!teaToDelete) return;
    
    try {
      const success = await deleteTea(teaToDelete.id);
      
      if (success) {
        setTeas(prev => prev.filter(tea => tea.id !== teaToDelete.id));
        closeModal();
        showNotification('Tea deleted from collection');
      } else {
        showNotification('Error deleting tea');
      }
    } catch (error) {
      console.error('Error deleting tea:', error);
      showNotification('Error deleting tea');
    }
  }, [teaToDelete, closeModal, showNotification]);

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

  // Render content based on loading/error state
  const renderContent = () => {
    if (isLoading) {
      // Show skeleton loading state
      return <SkeletonTeaList count={5} />;
    }
    
    if (loadError) {
      // Show error state with retry option
      return (
        <ErrorDisplay 
          error={loadError}
          message="We couldn't load your tea collection"
          onRetry={handleRetryLoading}
          showHome={false}
        />
      );
    }
    
    if (filteredTeas.length === 0) {
      // Show empty state
      return (
        <div className="empty-state">
          {searchTerm || filterType 
            ? "No teas match your filters." 
            : "Your collection is empty. Add some teas!"}
        </div>
      );
    }
    
    // Show tea list
    return (
      <div className="tea-collection-list">
        {filteredTeas.map(tea => (
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
        ))}
      </div>
    );
  };

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
              if (!isAddingTea) {
                resetTeaForm();
              }
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
        
        {/* Tea Collection List with loading states */}
        {renderContent()}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && teaToDelete && (
        <ConfirmationModal
          title="Delete Tea"
          message={`Are you sure you want to delete "${teaToDelete.name}" from your collection? This action cannot be undone.`}
          onConfirm={handleDeleteTea}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default TeaCollection;