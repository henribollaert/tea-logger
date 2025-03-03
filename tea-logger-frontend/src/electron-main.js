const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { PythonShell } = require('python-shell');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

// Initialize persistent storage
const store = new Store({
  defaults: {
    sessions: [],
    teas: [],
    settings: {
      useGoogleDrive: false,
      syncInterval: 600 // 10 minutes
    }
  }
});

// Backend process management
let backendProcess = null;

// Create the main application window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the React app
  const startUrl = process.env.ELECTRON_START_URL || 
    `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

// Start Python backend
function startBackend() {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const backendScript = path.join(__dirname, '../tea-logger-backend/app.py');

    const pyOptions = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'], // unbuffered output
      scriptPath: path.dirname(backendScript)
    };

    try {
      backendProcess = new PythonShell(backendScript, pyOptions);

      backendProcess.on('message', (message) => {
        console.log('Backend message:', message);
      });

      backendProcess.on('error', (err) => {
        console.error('Backend process error:', err);
        reject(err);
      });

      backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        backendProcess = null;
      });

      // Give backend a moment to start
      setTimeout(resolve, 2000);
    } catch (error) {
      console.error('Failed to start backend:', error);
      reject(error);
    }
  });
}

// Google Drive OAuth Handler
function setupGoogleDriveAuth() {
  const credentialsPath = path.join(__dirname, '../credentials.json');
  
  ipcMain.handle('google-drive-auth', async (event) => {
    try {
      // Load credentials
      const credentials = JSON.parse(fs.readFileSync(credentialsPath));
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      
      const oAuth2Client = new google.auth.OAuth2(
        client_id, 
        client_secret, 
        redirect_uris[0]
      );

      // Check for existing token
      const tokenPath = path.join(__dirname, '../token.json');
      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath));
        oAuth2Client.setCredentials(token);
        return { success: true };
      }

      // Generate authorization URL
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file']
      });

      // Open authorization window
      const authWindow = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      authWindow.loadURL(authUrl);

      return new Promise((resolve, reject) => {
        authWindow.webContents.on('will-redirect', async (event, url) => {
          try {
            const parsedUrl = new URL(url);
            const code = parsedUrl.searchParams.get('code');
            
            if (code) {
              const { tokens } = await oAuth2Client.getToken(code);
              oAuth2Client.setCredentials(tokens);
              
              // Save token to file
              fs.writeFileSync(tokenPath, JSON.stringify(tokens));
              
              authWindow.close();
              resolve({ success: true });
            }
          } catch (error) {
            reject({ success: false, error: error.message });
          }
        });
      });
    } catch (error) {
      console.error('Google Drive Auth Error:', error);
      return { success: false, error: error.message };
    }
  });
}

// App lifecycle management
app.on('ready', async () => {
  try {
    // Start backend
    await startBackend();
    
    // Create main window
    const mainWindow = createWindow();
    
    // Setup Google Drive Auth
    setupGoogleDriveAuth();

    // Handle app closing
    mainWindow.on('closed', () => {
      if (backendProcess) {
        backendProcess.kill();
      }
    });
  } catch (error) {
    dialog.showErrorBox('Startup Error', `Failed to start Tea Logger: ${error.message}`);
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  
  // Ensure backend process is terminated
  if (backendProcess) {
    backendProcess.kill();
  }
});

// macOS dock icon click handler
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for data persistence
ipcMain.handle('get-store-data', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-data', (event, key, value) => {
  store.set(key, value);
  return true;
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Critical Error', error.message);
});