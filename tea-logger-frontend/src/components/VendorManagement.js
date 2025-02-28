import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Plus, Trash, ChevronDown, ChevronUp } from 'lucide-react';
import './VendorManagement.css';

const VendorManagement = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [notification, setNotification] = useState('');
  const [newVendor, setNewVendor] = useState({
    name: '',
    aliases: [],
    newAlias: ''
  });

  // Load vendors from localStorage on component mount
  useEffect(() => {
    const storedVendors = localStorage.getItem('teaVendors');
    if (storedVendors) {
      setVendors(JSON.parse(storedVendors));
    } else {
      // Load default vendors if none exist
      const defaultVendors = [
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
      setVendors(defaultVendors);
      localStorage.setItem('teaVendors', JSON.stringify(defaultVendors));
    }
  }, []);

  // Save vendors to localStorage whenever they change
  useEffect(() => {
    if (vendors.length > 0) {
      localStorage.setItem('teaVendors', JSON.stringify(vendors));
    }
  }, [vendors]);

  // Filter vendors based on search term
  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.aliases.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleVendorChange = (e) => {
    const { name, value } = e.target;
    setNewVendor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAlias = () => {
    if (!newVendor.newAlias.trim()) return;
    
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
    if (!newVendor.name.trim()) return;
    
    const newVendorObj = {
      id: Date.now(),
      name: newVendor.name.trim(),
      aliases: newVendor.aliases,
      teas: []
    };
    
    setVendors(prev => [...prev, newVendorObj]);
    setIsAddingVendor(false);
    setNotification('Vendor added successfully');
    setTimeout(() => setNotification(''), 3000);
    
    // Reset form
    setNewVendor({
      name: '',
      aliases: [],
      newAlias: ''
    });
  };

  const handleDeleteClick = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteConfirm(true);
  };

  const handleDeleteVendor = () => {
    if (!vendorToDelete) return;
    
    setVendors(prev => prev.filter(v => v.id !== vendorToDelete.id));
    setShowDeleteConfirm(false);
    setVendorToDelete(null);
    setNotification('Vendor deleted successfully');
    setTimeout(() => setNotification(''), 3000);
  };

  const toggleVendorExpand = (vendorId) => {
    if (expandedVendor === vendorId) {
      setExpandedVendor(null);
    } else {
      setExpandedVendor(vendorId);
    }
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
              <label htmlFor="name">Vendor Name*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newVendor.name}
                onChange={handleVendorChange}
                className="form-input"
                required
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
                  disabled={!newVendor.newAlias.trim()}
                >
                  <Plus size={16} />
                </button>
              </div>
              {newVendor.aliases.length > 0 && (
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
                disabled={!newVendor.name.trim()}
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
        <div className="vendors-list">
          {filteredVendors.length === 0 ? (
            <div className="empty-state">
              {searchTerm 
                ? "No vendors match your search." 
                : "No vendors added yet. Add your first vendor!"}
            </div>
          ) : (
            filteredVendors.map(vendor => (
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
                      {vendor.aliases.length === 0 ? (
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
                      {vendor.teas.length === 0 ? (
                        <p className="empty-info">No teas found from this vendor</p>
                      ) : (
                        <div className="teas-container">
                          {vendor.teas.map((tea, index) => (
                            <div key={index} className="tea-item">{tea}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
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
                  setShowDeleteConfirm(false);
                  setVendorToDelete(null);
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