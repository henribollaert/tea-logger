import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toggleStorage, getSyncStatus, setSyncInterval, forceSync } from '../api';
import './Settings.css';

const Settings = () => {
  const [useGoogleDrive, setUseGoogleDrive] = useState(false);
  const [syncInterval, setSyncIntervalState] = useState(10); // 10 minutes default
  const [syncStatus, setSyncStatus] = useState({
    last_sync: 0,
    time_since_sync: 0,
    sync_interval: 600, // 10 minutes in seconds
    drive_dirty: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Load preference from localStorage
    const storedPreference = localStorage.getItem('useGoogleDrive') === 'true';
    setUseGoogleDrive(storedPreference);
    
    // Load sync interval from localStorage
    const storedInterval = localStorage.getItem('syncInterval');
    if (storedInterval) {
      const intervalMinutes = Math.round(parseInt(storedInterval, 10) / 60);
      setSyncIntervalState(intervalMinutes);
    }
    
    // Load sync status
    loadSyncStatus();
    
    // Refresh sync status every minute
    const intervalId = setInterval(loadSyncStatus, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const loadSyncStatus = async () => {
    const status = await getSyncStatus();
    setSyncStatus(status);
  };

  const handleToggleStorage = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // Toggle storage preference
      const newValue = !useGoogleDrive;
      const result = await toggleStorage(newValue);
      
      if (result && result.success !== false) {
        setUseGoogleDrive(newValue);
        setMessage(`Successfully switched to ${newValue ? 'Google Drive' : 'local'} storage.`);
        
        // Refresh sync status
        await loadSyncStatus();
      } else {
        setMessage('Failed to switch storage. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling storage:', error);
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncIntervalChange = async (e) => {
    const minutesValue = parseInt(e.target.value, 10);
    setSyncIntervalState(minutesValue);
    
    // Convert minutes to seconds for the backend
    const seconds = minutesValue * 60;
    
    try {
      const result = await setSyncInterval(seconds);
      if (result && result.success) {
        setMessage('Sync interval updated successfully.');
        await loadSyncStatus();
      }
    } catch (error) {
      console.error('Error updating sync interval:', error);
    }
  };

  const handleForceSync = async () => {
    if (!useGoogleDrive) {
      setMessage('Enable Google Drive to use sync functionality.');
      return;
    }
    
    setIsSyncing(true);
    setMessage('');
    
    try {
      const result = await forceSync();
      if (result && result.success) {
        setMessage('Successfully synced with Google Drive.');
        await loadSyncStatus();
      } else {
        setMessage(`Sync failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error forcing sync:', error);
      setMessage('An error occurred during sync. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Format the last sync time
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <button onClick={() => navigate('/')} className="icon-button">
            <ArrowLeft size={24} />
          </button>
          <h1 className="app-title">Settings</h1>
          <div className="spacer"></div> {/* Spacer for alignment */}
        </div>
      </header>
      
      <div className="main-content">
        {/* Storage Settings */}
        <div className="settings-section">
          <h3 className="section-title">Storage</h3>
          <div className="storage-option">
            <div className="storage-info">
              <h4>Google Drive</h4>
              <p>Store your tea sessions in your Google Drive account</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={useGoogleDrive} 
                onChange={handleToggleStorage}
                disabled={isLoading}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          {useGoogleDrive && (
            <>
              <div className="sync-settings">
                <div className="sync-interval">
                  <h4>Sync Interval</h4>
                  <p>How often to sync with Google Drive</p>
                  <select 
                    value={syncInterval} 
                    onChange={handleSyncIntervalChange}
                    className="interval-select"
                  >
                    <option value="1">1 minute</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="360">6 hours</option>
                    <option value="720">12 hours</option>
                    <option value="1440">24 hours</option>
                  </select>
                </div>
                
                <div className="sync-info">
                  <p>Last sync: {formatLastSync(syncStatus.last_sync)}</p>
                  {syncStatus.drive_dirty && (
                    <p className="sync-warning">Local changes pending sync</p>
                  )}
                </div>
                
                <button 
                  className="sync-button"
                  onClick={handleForceSync}
                  disabled={isSyncing}
                >
                  <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </>
          )}
          
          {message && <div className="settings-message">{message}</div>}
        </div>
        
        {/* App Info Section */}
        <div className="settings-section">
          <h3 className="section-title">About</h3>
          <div className="app-info">
            <p>Tea Logger v1.0</p>
            <p>A simple app to track your tea drinking sessions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;