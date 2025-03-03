const { contextBridge, ipcRenderer } = require('electron');

// Expose a simplified API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Storage methods
  getStoreData: (key) => ipcRenderer.invoke('get-store-data', key),
  setStoreData: (key, value) => ipcRenderer.invoke('set-store-data', key, value),
  
  // Google Drive Authentication
  googleDriveAuth: () => ipcRenderer.invoke('google-drive-auth'),
  
  // Additional methods can be added here
  platform: process.platform
});