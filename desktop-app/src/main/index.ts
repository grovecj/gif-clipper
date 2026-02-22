import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, clipboard, shell, Notification } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createStore } from './store';
import { registerGlobalShortcuts, unregisterAllShortcuts } from './shortcuts';
import { startRegionSelection, registerOverlayIPC } from './overlay';
import { showCountdown } from './countdown';
import { startRecording, stopRecording } from './recorder';
import { encodeGif } from './encoder';
import { showRecordingIndicator, closeRecordingIndicator } from './recording-indicator';
import { uploadGif } from './uploader';

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
    console.log('Capture cancelled during region selection');
    return;
  }

  console.log('Selected region:', bounds);

  // Step 2: Countdown
  const countdownDuration = store.get('countdown.duration', 3);

  if (countdownDuration > 0) {
    const countdownCompleted = await new Promise<boolean>((resolve) => {
      showCountdown({
        bounds,
        duration: countdownDuration,
        onComplete: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!countdownCompleted) {
      console.log('Capture cancelled during countdown');
      return;
    }
  }

  console.log('Countdown complete, ready to record');
  console.log(`Capture region: ${bounds.width}x${bounds.height} at (${bounds.x}, ${bounds.y})`);

  const fps = store.get('recording.fps', 15);
  const maxDuration = store.get('recording.maxDuration', 30);

  // Notify renderer that capture has started
  mainWindow?.webContents.send('capture:started');

  // Show recording indicator and register Escape to stop
  showRecordingIndicator(bounds);
  const stopKey = store.get('hotkeys.stopCapture', 'Escape');
  globalShortcut.register(stopKey, () => {
    stopRecording();
  });

  let videoPath: string;
  try {
    // Step 3: Recording
    console.log(`Starting recording at ${fps} fps, max ${maxDuration}s...`);
    videoPath = await startRecording({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      fps,
      maxDuration,
    });
    console.log(`Recording saved: ${videoPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Recording failed:', message);
    mainWindow?.webContents.send('capture:error', message);
    return;
  } finally {
    // Close indicator and unregister stop key immediately after recording ends
    closeRecordingIndicator();
    if (globalShortcut.isRegistered(stopKey)) {
      globalShortcut.unregister(stopKey);
    }
  }

  // Steps 4 & 5 run in the background — no UI blocking
  try {
    // Step 4: Encoding
    console.log('Encoding GIF...');
    const gifPath = await encodeGif(videoPath, fps);
    console.log(`GIF encoded: ${gifPath}`);

    // Step 5: Upload to backend
    const apiUrl = store.get('upload.apiUrl', 'https://gif.cartergrove.me');
    try {
      console.log('Uploading GIF...');
      const result = await uploadGif(gifPath, apiUrl);

      // Copy URL to clipboard
      if (store.get('upload.copyToClipboard', true)) {
        clipboard.writeText(result.url);
      }

      // Show system notification
      if (store.get('upload.showNotification', true)) {
        new Notification({
          title: 'GIF Captured!',
          body: store.get('upload.copyToClipboard', true)
            ? 'URL copied to clipboard'
            : result.url,
        }).show();
      }

      // Open in browser
      if (store.get('upload.openInBrowser', false)) {
        shell.openExternal(result.url);
      }

      mainWindow?.webContents.send('capture:complete', result.url);
    } catch (uploadErr) {
      const uploadMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.error('Upload failed, saving locally:', uploadMsg);

      // Fallback: copy local path to clipboard
      clipboard.writeText(gifPath);
      new Notification({
        title: 'GIF Saved Locally',
        body: 'Upload failed. File path copied to clipboard.',
      }).show();

      mainWindow?.webContents.send('capture:complete', gifPath);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Capture failed:', message);
    mainWindow?.webContents.send('capture:error', message);
  }
};

const createTray = (): void => {
  // Create a simple 16x16 tray icon (purple circle for GIF Clipper)
  const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEPSURBVDiNpZMxTsNAEEXfbNaWHCkFBRIdN0DiCJRcgCNwFU5AR0OBkEIRxSaK5V3PUNhxHAfISDv6M/P/zO6MYOLJl9lOcQ0sgVCX+RX4BN6B1+TUHlKBiHwDN8ADsKrLvAX2wBNwByTgK9lRgcFHYB4/gDBsWJf5ATh6BubA/Z8Gv/k2cwNc9sDJcKh/qNp8A5aBPdPx8OGcvAYum5N5d0o/4Dha4BqVr7T0S9zY6kbMv7Nz0pMbFyqWmWXztzqdTrsA8k5m2VCH9KMOT0Ak7u+k+yQJAAAA8A0Adtv0BADiMHABfAzn5EnwCViYAHhzqLpz8ySJw5QA+HIo5d4xfgGrQPLmUPWgc/IJeAa+gL0J8A2EPTSfChZhEgAAAABJRU5ErkJggg==';
  const icon = nativeImage.createFromDataURL(iconDataUrl);

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

  ipcMain.handle('capture:stop', () => {
    stopRecording();
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
