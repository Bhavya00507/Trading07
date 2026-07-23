const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const log = require('electron-log');

log.transports.file.level = 'info';
log.info('App starting...');

let mainWindow = null;
let splashWindow = null;
let backendProcess = null;
let backendStartupLogs = '';
const isDev = !app.isPackaged;

if (!isDev) {
  process.env.NODE_ENV = 'production';
  process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
}

// Single instance lock protection
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.info('Another instance is already running. Exiting.');
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Checks if the backend is responsive on the health check endpoint.
 * Returns a Promise that resolves to a boolean (true if healthy, false otherwise).
 */
async function checkBackendReady() {
  return new Promise((resolve) => {
    const options = {
      host: '127.0.0.1',
      port: 8000,
      path: '/health',
      method: 'GET',
      timeout: 1000
    };

    const req = http.request(options, (res) => {
      // CRITICAL BUG FIX: Always consume the response stream to free the socket.
      // Failing to do so causes Node's HTTP Agent socket pool to exhaust,
      // queuing all subsequent requests indefinitely and causing a false timeout.
      res.resume();
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Spawns the compiled backend.exe if it's not already running.
 */
async function startBackend() {
  const ready = await checkBackendReady();
  if (ready) {
    log.info('Backend is already running on port 8000. Reusing active instance.');
    return;
  }

  log.info('Starting backend services...');
  
  let executablePath;
  let args = [];
  
  if (isDev) {
    // In development, run backend.exe if built, otherwise fall back to python main.py
    const devExe = path.join(__dirname, 'backend', 'dist', 'backend', 'backend.exe');
    const fs = require('fs');
    if (fs.existsSync(devExe)) {
      executablePath = devExe;
    } else {
      executablePath = 'python';
      args = ['-u', path.join(__dirname, 'backend', 'main.py')];
    }
  } else {
    // In production, execute the packaged backend.exe from resourcesPath
    executablePath = path.join(process.resourcesPath, 'backend', 'backend.exe');
  }

  log.info(`Spawning backend: ${executablePath} with args [${args.join(', ')}]`);

  const spawnOptions = {
    cwd: path.dirname(executablePath === 'python' ? path.join(__dirname, 'backend') : executablePath),
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    windowsHide: true
  };

  backendProcess = spawn(executablePath, args, spawnOptions);

  backendProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    backendStartupLogs += msg;
    log.info(`[Backend STDOUT]: ${msg.trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    backendStartupLogs += msg;
    log.error(`[Backend STDERR]: ${msg.trim()}`);
  });

  backendProcess.on('error', (err) => {
    log.error(`Failed to spawn backend process: ${err.message}`);
    dialog.showErrorBox(
      'Backend Spawn Error',
      `Failed to spawn backend process:\n${err.message}\n\nExecutable: ${executablePath}`
    );
    app.quit();
  });

  backendProcess.on('exit', (code, signal) => {
    log.info(`Backend process exited with code ${code} and signal ${signal}`);
    if (!mainWindow) {
      const detailMsg = backendStartupLogs 
        ? `Backend logs:\n${backendStartupLogs}` 
        : 'No logs captured from backend.';
      dialog.showErrorBox(
        'Backend Startup Crash',
        `Backend process exited unexpectedly during startup.\nExit Code: ${code}\nSignal: ${signal}\n\n${detailMsg}`
      );
      app.quit();
    } else {
      dialog.showErrorBox(
        'Backend Crash',
        'The backend service disconnected unexpectedly. The application will now close.'
      );
      app.quit();
    }
  });
}

/**
 * Polls the health endpoint periodically until it is responsive or max attempts are reached.
 */
async function waitForBackend(maxAttempts = 30, intervalMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log.info(`Checking backend health (attempt ${attempt}/${maxAttempts})...`);
    
    if (backendProcess && backendProcess.killed) {
      throw new Error('Backend process was terminated during startup.');
    }

    const ready = await checkBackendReady();
    if (ready) {
      log.info('Backend is responsive and healthy.');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Failed to initialize secure backend services on port 8000 after ${maxAttempts} seconds.`);
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Log failures inside the main window
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log.error(`[did-fail-load] code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error(`[render-process-gone] reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (level >= 2) log.error(`[Renderer] ${message}`);
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/').catch(() => {
      log.info(`[Dev Fallback] Dev server unreachable. Loading built bundle: ${indexPath}`);
      mainWindow.loadFile(indexPath).catch((err) => {
        log.error(`[Dev Fallback] Load failed: ${err.message}`);
      });
    });
    mainWindow.webContents.openDevTools();
  } else {
    log.info(`[Production] Loading index from: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch((err) => {
      log.error(`[Production] loadFile failed: ${err.message}`);
      const fallback = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
      mainWindow.loadFile(fallback).catch((err2) => {
        log.error(`[Production] Fallback also failed: ${err2.message}`);
        mainWindow.loadURL('data:text/html,<h1 style="font-family:sans-serif;padding:40px;color:red">ERROR: dist/index.html could not be loaded.<br>Check logs.</h1>');
      });
    });
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupMenu();
}

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Trading Terminal',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Trading Terminal',
              message: 'Trading Terminal Desktop',
              detail: `Version: ${app.getVersion()}\nProfessional desktop trading platform with TradingView chart integration, order routing, and AI analytics.`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App Ready Startup flow
app.on('ready', async () => {
  // Boot directly to the main window
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  log.info('App quitting...');
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught Exception in Main Process: ${error.message}`);
  log.error(error.stack);
});
