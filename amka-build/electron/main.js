const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { createServer } = require('http');
const fs = require('fs');

// LOGGING SYSTEM
const logFile = path.join(app.isPackaged ? process.resourcesPath : __dirname, '..', 'server-debug.log');
function debugLog(msg) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] ${msg}\n`;
  console.log(formattedMsg.trim());
  try {
    fs.appendFileSync(logFile, formattedMsg);
  } catch (e) {}
}

debugLog('--- Application Starting ---');
debugLog(`Is Packaged: ${app.isPackaged}`);
debugLog(`Resources Path: ${process.resourcesPath}`);

require('dotenv').config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', '.env.local')
    : path.join(__dirname, '..', '.env.local')
});

debugLog(`Env Load Check: SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'LOADED' : 'MISSING'}`);

const PORT = 3000;

let mainWindow;
let server;

process.on('uncaughtException', (err) => {
  debugLog(`Uncaught Exception: ${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  debugLog(`Unhandled Rejection: ${reason}`);
});

async function startNextServer() {
  let dir;
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    const unpackedDir = path.join(resourcesPath, 'app.asar.unpacked');
    const appDir = path.join(resourcesPath, 'app');

    if (fs.existsSync(path.join(unpackedDir, '.next'))) {
      dir = unpackedDir;
    } else if (fs.existsSync(path.join(appDir, '.next'))) {
      dir = appDir;
    } else {
      debugLog('CRITICAL ERROR: .next directory not found');
      throw new Error(`The compiled application files (.next) are missing.`);
    }
  } else {
    dir = path.join(__dirname, '..');
  }

  debugLog(`Next.js serving from: ${dir}`);

  // In standalone mode, Next.js generates a self-contained server at .next/standalone/server.js
  const standaloneServerPath = path.join(dir, '.next', 'standalone', 'server.js');

  if (fs.existsSync(standaloneServerPath)) {
    debugLog(`Using standalone server: ${standaloneServerPath}`);

    const standaloneDir = path.join(dir, '.next', 'standalone');
    const standaloneNodeModules = path.join(standaloneDir, 'node_modules');
    const unpackedNodeModules = path.join(dir, 'node_modules');

    // Add node_modules search paths
    const Module = require('module');
    const searchPaths = [standaloneNodeModules, unpackedNodeModules].filter(p => fs.existsSync(p));
    if (searchPaths.length > 0) {
      debugLog(`Adding node_modules search paths: ${searchPaths.join(';')}`);
      searchPaths.forEach(p => {
        if (!Module.globalPaths.includes(p)) Module.globalPaths.push(p);
      });
      process.env.NODE_PATH = searchPaths.join(';') + (process.env.NODE_PATH ? ';' + process.env.NODE_PATH : '');
      Module._initPaths();
    }

    // Set environment variables that the standalone server needs
    process.env.PORT = String(PORT);
    process.env.HOSTNAME = '127.0.0.1';

    // The standalone server needs to know its directory
    process.chdir(standaloneDir);

    return new Promise((resolve, reject) => {
      try {
        require(standaloneServerPath);
        // The standalone server starts listening on its own
        // Wait a bit for it to be ready
        const checkReady = () => {
          const http = require('http');
          const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
            debugLog(`Standalone server responded with status: ${res.statusCode}`);
            resolve();
          });
          req.on('error', () => {
            debugLog('Waiting for standalone server to be ready...');
            setTimeout(checkReady, 200);
          });
          req.end();
        };
        setTimeout(checkReady, 500);
      } catch (err) {
        debugLog(`Standalone server error: ${err.stack}`);
        reject(err);
      }
    });
  }

  // Fallback: use the programmatic Next.js API (dev or non-standalone builds)
  debugLog('Standalone server.js not found, falling back to programmatic API');
  const next = require('next');
  const nextApp = next({ dev: false, dir });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  return new Promise((resolve, reject) => {
    server = createServer((req, res) => {
      debugLog(`Request: ${req.method} ${req.url}`);
      handle(req, res).catch(err => {
        debugLog(`Next.js Handler Error: ${err.stack}`);
      });

      // Log response status code for debugging
      const origEnd = res.end;
      res.end = function (...args) {
        if (res.statusCode >= 400) {
          debugLog(`Response Error: ${req.method} ${req.url} -> ${res.statusCode}`);
        }
        return origEnd.apply(this, args);
      };
    });
    server.listen(PORT, '127.0.0.1', (err) => {
      if (err) {
        debugLog(`Server start error: ${err.stack}`);
        reject(err);
      } else {
        debugLog(`Next.js server running on http://127.0.0.1:${PORT}`);
        resolve();
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    debugLog(`[Browser Console L${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    debugLog(`[Load Error ${errorCode}] ${errorDescription} at ${validatedURL}`);
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    debugLog('Starting Next.js server...');
    await startNextServer();
    debugLog('Server ready, creating window...');
    createWindow();
  } catch (err) {
    debugLog(`Failed to start application: ${err.stack}`);
    dialog.showErrorBox('Critical Error', `The application failed to start: ${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (server) server.close();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
