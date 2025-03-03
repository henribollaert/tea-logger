// src/components/VendorManagement.js - Fixed error handling
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Plus, Trash, ChevronDown, ChevronUp } from 'lucide-react';
import './VendorManagement.css';
import { fetchDashboardData } from '../api';
import { normalizeVendorName } from '../teaApi';

// Import custom hooks
import { useNotification } from '../hooks/useNotification';
import { useModal } from '../hooks/useModal';

// Import common components
import { TextField } from './common/FormFields';
import { SkeletonTeaList } from './common/Skeleton';
import ErrorDisplay from './common/ErrorDisplay';

const VendorManagement = () => {
  const navigate = useNavigate();
  
  // Use custom hooks
  const { notification, showNotification } = useNotification();
  const { isOpen: showDeleteConfirm, modalData: vendorToDelete, openModal, closeModal } = useModal();
  
  // Component state
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [newVendor, setNewVendor] = useState({
    name: '',
    aliases: [],
    newAlias: ''
  });
  
  // Safer way to handle vendor data population
  const populateVendorTeas = useCallback((vendorList, teaList) => {
    if (!Array.isArray(vendorList) || !Array.isArray(teaList)) {
      console.warn('Invalid data for populateVendorTeas', { vendorList, teaList });
      return vendorList;
    }
    
    try {
      // Create a map of vendor names to lists of teas
      const vendorTeaMap = new Map();
      
      // Initialize map with empty arrays for each vendor
      vendorList.forEach(vendor => {
        if (vendor && vendor.name) {
          vendorTeaMap.set(vendor.name.toLowerCase(), []);
          
          // Also add entries for aliases
          if (Array.isArray(vendor.aliases)) {
            vendor.aliases.forEach(alias => {
              if (alias) {
                vendorTeaMap.set(alias.toLowerCase(), vendor.name);
              }
            });
          }
        }
      });
      
      // Populate the map with teas
      teaList.forEach(tea => {
        if (tea && tea.vendor) {
          try {
            const normalizedVendor = normalizeVendorName(tea.vendor);
            const vendorKey = normalizedVendor.toLowerCase();
            
            if (vendorTeaMap.has(vendorKey)) {
              // Direct vendor match
              const vendorTeas = vendorTeaMap.get(vendorKey);
              if (Array.isArray(vendorTeas)) {
                vendorTeas.push(tea);
              }
            } else {
              // Check if it's an alias
              const aliasValue = vendorTeaMap.get(vendorKey);
              if (typeof aliasValue === 'string') {
                const actualVendorKey = aliasValue.toLowerCase();
                const vendorTeas = vendorTeaMap.get(actualVendorKey);
                if (Array.isArray(vendorTeas)) {
                  vendorTeas.push(tea);
                }
              }
            }
          } catch (error) {
            console.warn(`Error processing tea: ${tea.name}`, error);
          }
        }
      });
      
      // Update vendors with teas
      const updatedVendors = vendorList.map(vendor => {
        if (!vendor || !vendor.name) return vendor;
        
        const vendorTeas = vendorTeaMap.get(vendor.name.toLowerCase()) || [];
        return {
          ...vendor,
          teas: vendorTeas
        };
      });
      
      // Update state and storage
      setVendors(updatedVendors);
      localStorage.setItem('teaVendors', JSON.stringify(updatedVendors));
      
      return updatedVendors;
    } catch (error) {
      console.error('Error in populateVendorTeas:', error);
      return vendorList;
    }
  }, []);

  // Load vendors from localStorage on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // Load vendors safely
        let vendorList = [];
        try {
          const storedVendors = localStorage.getItem('teaVendors');
          if (storedVendors) {
            vendorList = JSON.parse(storedVendors);
          }
        } catch (parseError) {
          console.warn('Error parsing stored vendors, using defaults:', parseError);
        }
        
        // If no vendors or parsing failed, use defaults
        if (!Array.isArray(vendorList) || vendorList.length === 0) {
          vendorList = [
            { 
              id: 1, 
              name: 'White2Tea', 
              aliases: ['w2t', 'white2tea'],
              teas: []
            },
            { 
              id: 2, 
              name: 'Crimson Lotus Tea', 
              aliases: ['clt', 'crimson'],
              teas: []
            },
            { 
              id: 3, 
              name: 'Yunnan Sourcing', 
              aliases: ['ys', 'yunnansourcing'],
              teas: []
            },
            { 
              id: 4, 
              name: 'Bitterleaf Teas', 
              aliases: ['bt', 'bitterleaf'],
              teas: []
            },
            { 
              id: 5, 
              name: 'Essence of Tea', 
              aliases: ['eot'],
              teas: []
            }
          ];
          localStorage.setItem('teaVendors', JSON.stringify(vendorList));
        }
        
        // First set vendors without teas
        setVendors(vendorList);
        
        // Load teas to populate vendor tea lists
        const dashboardData = await fetchDashboardData();
        
        if (dashboardData && Array.isArray(dashboardData.teas)) {
          // Populate vendor teas
          populateVendorTeas(vendorList, dashboardData.teas);
        } else {
          console.warn('Dashboard data missing teas', dashboardData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setLoadError(error);
        showNotification('Error loading vendors');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [showNotification, populateVendorTeas]);

  // Handle retrying data load
  const handleRetryLoading = useCallback(() => {
    setLoadError(null);
    window.location.reload();
  }, []);

  // Safe filtering of vendors - Fixed implementation
  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    if (!searchTerm) return vendors;
    
    const term = searchTerm.toLowerCase();
    return vendors.filter(vendor => {
      // Check for null vendor
      if (!vendor) return false;
      
      // Check name match
      if (vendor.name && vendor.name.toLowerCase().includes(term)) {
        return true;
      }
      
      // Check aliases
      if (Array.isArray(vendor.aliases)) {
        return vendor.aliases.some(alias => alias && alias.toLowerCase().includes(term));
      }
      
      return false;
    });
  }, [vendors, searchTerm]);

  const handleVendorChange = (e) => {
    const { name, value } = e.target;
    setNewVendor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAlias = () => {
    if (!newVendor.newAlias?.trim()) return;
    
    setNewVendor(prev => ({
      ...prev,
      aliases: [...prev.aliases, prev.newAlias.trim().toLowerCase()],
      newAlias: ''
    }));
  };

  const handleRemoveAlias = (aliasToRemove) => {
    setNewVendor(prev => ({
      ...prev,
      aliases: prev.aliases.filter(alias => alias !== aliasToRemove)
    }));
  };

  const handleAddVendor = () => {
    if (!newVendor.name?.trim()) return;
    
    // Normalize the vendor name for consistency
    const normalizedName = normalizeVendorName(newVendor.name);
    
    // Check if vendor with this name already exists
    const existingVendor = vendors.find(v => 
      v.name?.toLowerCase() === normalizedName.toLowerCase()
    );
    
    if (existingVendor) {
      showNotification(`Vendor "${normalizedName}" already exists`);
      return;
    }
    
    const newVendorObj = {
      id: Date.now(),
      name: normalizedName,
      aliases: newVendor.aliases || [],
      teas: []
    };
    
    const updatedVendors = [...vendors, newVendorObj];
    setVendors(updatedVendors);
    setIsAddingVendor(false);
    showNotification('Vendor added successfully');
    
    // Save to localStorage
    localStorage.setItem('teaVendors', JSON.stringify(updatedVendors));
    
    // Reset form
    setNewVendor({
      name: '',
      aliases: [],
      newAlias: ''
    });
  };

  const handleDeleteClick = (vendor) => {
    openModal(vendor);
  };

  const handleDeleteVendor = () => {
    if (!vendorToDelete) return;
    
    const updatedVendors = vendors.filter(v => v.id !== vendorToDelete.id);
    setVendors(updatedVendors);
    closeModal();
    showNotification('Vendor deleted successfully');
    
    // Save to localStorage
    localStorage.setItem('teaVendors', JSON.stringify(updatedVendors));
  };

  const toggleVendorExpand = (vendorId) => {
    if (expandedVendor === vendorId) {
      setExpandedVendor(null);
    } else {
      setExpandedVendor(vendorId);
    }
  };

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <SkeletonTeaList count={3} />;
    }
    
    if (loadError) {
      return (
        <ErrorDisplay 
          error={loadError}
          message="We couldn't load your vendor information"
          onRetry={handleRetryLoading}
          showHome={false}
        />
      );
    }
    
    if (filteredVendors.length === 0) {
      return (
        <div className="empty-state">
          {searchTerm 
            ? "No vendors match your search." 
            : "No vendors added yet. Add your first vendor!"}
        </div>
      );
    }
    
    return (
      <div className="vendors-list">
        {filteredVendors.map(vendor => (
          <div key={vendor.id} className="vendor-card">
            <div 
              className="vendor-header"
              onClick={() => toggleVendorExpand(vendor.id)}
            >
              <div className="vendor-name">{vendor.name}</div>
              <div className="vendor-controls">
                <button
                  className="action-button delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(vendor);
                  }}
                  aria-label="Delete vendor"
                >
                  <Trash size={16} />
                </button>
                <button className="action-button expand-button">
                  {expandedVendor === vendor.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            
            {expandedVendor === vendor.id && (
              <div className="vendor-details">
                <div className="vendor-aliases">
                  <h4>Aliases</h4>
                  {!vendor.aliases || vendor.aliases.length === 0 ? (
                    <p className="empty-info">No aliases added</p>
                  ) : (
                    <div className="aliases-container">
                      {vendor.aliases.map((alias, index) => (
                        <span key={index} className="alias-chip">{alias}</span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="vendor-teas">
                  <h4>Teas</h4>
                  {!vendor.teas || vendor.teas.length === 0 ? (
                    <p className="empty-info">No teas found from this vendor</p>
                  ) : (
                    <div className="teas-container">
                      {vendor.teas.map((tea, index) => (
                        <div key={index} className="tea-item" onClick={() => navigate('/collection')}>
                          {tea.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
              setIsAddingVendor(!isAddingVendor);
            }} 
            className="icon-button"
          >
            {isAddingVendor ? <X size={20} /> : <Plus size={20} />}
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
        
        {/* Add Vendor Form */}
        {isAddingVendor && (
          <div className="vendor-form">
            <h3 className="form-title">Add New Vendor</h3>
            
            <div className="form-group">
              <TextField
                label="Vendor Name"
                name="name"
                value={newVendor.name}
                onChange={handleVendorChange}
                required
                placeholder="Enter vendor name"
              />
            </div>
            
            <div className="form-group">
              <label>Aliases</label>
              <div className="alias-input-group">
                <input
                  type="text"
                  name="newAlias"
                  value={newVendor.newAlias}
                  onChange={handleVendorChange}
                  className="form-input"
                  placeholder="Add an alias (e.g., w2t)"
                />
                <button 
                  onClick={handleAddAlias}
                  className="add-alias-button"
                  disabled={!newVendor.newAlias?.trim()}
                >
                  <Plus size={16} />
                </button>
              </div>
              {newVendor.aliases && newVendor.aliases.length > 0 && (
                <div className="alias-list">
                  {newVendor.aliases.map((alias, index) => (
                    <div key={index} className="alias-tag">
                      <span>{alias}</span>
                      <button 
                        onClick={() => handleRemoveAlias(alias)}
                        className="remove-alias-button"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="alias-help-text">
                Aliases help identify vendors in quick input (e.g., "w2t" for "White2Tea")
              </p>
            </div>
            
            <div className="form-actions">
              <button 
                className="cancel-button"
                onClick={() => setIsAddingVendor(false)}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={handleAddVendor}
                disabled={!newVendor.name?.trim()}
              >
                Add Vendor
              </button>
            </div>
          </div>
        )}
        
        {/* Search Box */}
        <div className="search-container">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="clear-search"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Vendors List */}
        {renderContent()}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && vendorToDelete && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <h3 className="modal-title">Delete Vendor</h3>
            <p className="modal-message">
              Are you sure you want to delete "{vendorToDelete.name}"? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  closeModal();
                }}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={handleDeleteVendor}
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

export default VendorManagement;