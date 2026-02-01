import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createStore } from './store';
import { registerGlobalShortcuts, unregisterAllShortcuts } from './shortcuts';
import { startRegionSelection, registerOverlayIPC, SelectionBounds } from './overlay';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const store = createStore();

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false, // Start hidden, show from tray
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.on('close', (event) => {
    // Prevent closing, just hide
    event.preventDefault();
    mainWindow?.hide();
  });

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

const startCaptureWorkflow = async (): Promise<void> => {
  console.log('Starting capture workflow...');

  // Step 1: Region selection
  const bounds = await startRegionSelection();

  if (!bounds) {
    console.log('Capture cancelled');
    return;
  }

  console.log('Selected region:', bounds);

  // Step 2: Countdown (TODO: implement in issue #7)
  // Step 3: Recording (TODO: implement in issue #8)
  // Step 4: Encoding (TODO: implement in issue #9)
  // Step 5: Upload (TODO: implement in issue #10)

  // For now, just log the selection
  console.log(`Capture region: ${bounds.width}x${bounds.height} at (${bounds.x}, ${bounds.y})`);
};

const createTray = (): void => {
  // Create a simple 16x16 tray icon
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Gif Clipper');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Start Capture',
      accelerator: store.get('hotkeys.startCapture', 'CommandOrControl+Shift+G'),
      click: () => {
        startCaptureWorkflow();
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'About Gif Clipper',
      click: () => {
        // TODO: Show about dialog
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CommandOrControl+Q',
      click: () => {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
};

// Register IPC handlers
const registerIPC = (): void => {
  // Overlay IPC
  registerOverlayIPC();

  // Capture IPC
  ipcMain.handle('capture:start', async () => {
    await startCaptureWorkflow();
  });

  // Window IPC
  ipcMain.on('window:hide', () => {
    mainWindow?.hide();
  });

  ipcMain.on('window:show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
};

app.whenReady().then(() => {
  registerIPC();
  createWindow();
  createTray();
  registerGlobalShortcuts(store, startCaptureWorkflow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray, don't quit
});

app.on('will-quit', () => {
  unregisterAllShortcuts();
  tray?.destroy();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
