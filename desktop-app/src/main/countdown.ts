import { BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

export interface CountdownOptions {
  bounds: { x: number; y: number; width: number; height: number };
  duration: number;
  onComplete: () => void;
  onCancel: () => void;
}

let countdownWindow: BrowserWindow | null = null;

export const showCountdown = (options: CountdownOptions): void => {
  const { bounds, duration, onComplete, onCancel } = options;

  // Create a small window centered on the selected region
  const windowSize = 150;
  const x = Math.round(bounds.x + bounds.width / 2 - windowSize / 2);
  const y = Math.round(bounds.y + bounds.height / 2 - windowSize / 2);

  countdownWindow = new BrowserWindow({
    x,
    y,
    width: windowSize,
    height: windowSize,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the countdown page
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    countdownWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/countdown`);
  } else {
    countdownWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash: '/countdown' }
    );
  }

  // Send countdown config when ready
  countdownWindow.webContents.on('did-finish-load', () => {
    countdownWindow?.webContents.send('countdown:init', { duration });
  });

  // Handle countdown completion
  const handleComplete = () => {
    closeCountdown();
    onComplete();
  };

  const handleCancel = () => {
    closeCountdown();
    onCancel();
  };

  // Set up one-time IPC handlers for this countdown session
  ipcMain.handleOnce('countdown:complete', handleComplete);
  ipcMain.handleOnce('countdown:cancel', handleCancel);

  countdownWindow.on('closed', () => {
    countdownWindow = null;
    // Remove handlers if window closed unexpectedly
    ipcMain.removeHandler('countdown:complete');
    ipcMain.removeHandler('countdown:cancel');
  });
};

export const closeCountdown = (): void => {
  if (countdownWindow) {
    countdownWindow.close();
    countdownWindow = null;
  }
};
