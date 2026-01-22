const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let splashWindow;
let backendProcess;
const BACKEND_PORT = 8002;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Get the path to resources based on whether we're in dev or production
function getResourcePath(resourceName) {
  if (isDev) {
    // In development, resources are in the project directory
    return path.join(__dirname, '..', 'resources', resourceName);
  } else {
    // In production, resources are in the app's Resources folder
    return path.join(process.resourcesPath, resourceName);
  }
}

// Start the Python backend
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = getResourcePath('backend');

    let backendExecutable;
    if (process.platform === 'win32') {
      backendExecutable = path.join(backendPath, 'cubbyscore-backend.exe');
    } else {
      backendExecutable = path.join(backendPath, 'cubbyscore-backend');
    }

    // Set environment variables for Audiveris path
    const audiverisPath = getResourcePath('audiveris');
    const env = {
      ...process.env,
      AUDIVERIS_PATH: path.join(audiverisPath, 'bin', 'Audiveris'),
      PORT: BACKEND_PORT.toString(),
    };

    console.log('Starting backend:', backendExecutable);
    console.log('Audiveris path:', audiverisPath);

    backendProcess = spawn(backendExecutable, [], {
      env,
      cwd: backendPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend error: ${data}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      console.log(`Backend exited with code ${code}`);
      backendProcess = null;
    });

    // Wait for backend to be ready
    waitForBackend(resolve, reject);
  });
}

// Poll the backend health endpoint until it's ready
function waitForBackend(resolve, reject, attempts = 0) {
  const maxAttempts = 30; // 30 seconds timeout

  const req = http.get(`http://localhost:${BACKEND_PORT}/health`, (res) => {
    if (res.statusCode === 200) {
      console.log('Backend is ready');
      resolve();
    } else {
      retry();
    }
  });

  req.on('error', () => {
    retry();
  });

  req.setTimeout(1000, () => {
    req.destroy();
    retry();
  });

  function retry() {
    if (attempts >= maxAttempts) {
      reject(new Error('Backend failed to start within timeout'));
    } else {
      setTimeout(() => waitForBackend(resolve, reject, attempts + 1), 1000);
    }
  }
}

// Stop the backend process
function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
    }
    backendProcess = null;
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 350,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#00000000',
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
  splashWindow.show();

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function closeSplashWindow() {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#12101a', // Dark theme background
    show: false,
  });

  // Load the app
  if (isDev) {
    // In development, load from Next.js dev server
    mainWindow.loadURL('http://localhost:3005');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the exported Next.js app
    const startUrl = url.format({
      pathname: path.join(__dirname, '../out/index.html'),
      protocol: 'file:',
      slashes: true,
    });
    mainWindow.loadURL(startUrl);
  }

  mainWindow.once('ready-to-show', () => {
    closeSplashWindow();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Show splash screen immediately
    createSplashWindow();

    // In development, backend is started separately
    if (!isDev) {
      await startBackend();
    }

    // Create main window (splash closes when main window is ready)
    createWindow();
  } catch (err) {
    console.error('Failed to start app:', err);
    closeSplashWindow();
    dialog.showErrorBox('Startup Error', `Failed to start the converter: ${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopBackend();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  stopBackend();
});
