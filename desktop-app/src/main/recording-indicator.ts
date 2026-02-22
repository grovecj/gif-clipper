import { BrowserWindow } from 'electron';
import path from 'node:path';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let indicatorWindow: BrowserWindow | null = null;

export interface IndicatorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function showRecordingIndicator(bounds: IndicatorBounds): void {
  if (indicatorWindow) {
    closeRecordingIndicator();
  }

  indicatorWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Allow clicks to pass through the window except on interactive elements
  indicatorWindow.setIgnoreMouseEvents(true, { forward: true });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    indicatorWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/recording`);
  } else {
    indicatorWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash: '/recording' }
    );
  }

  indicatorWindow.webContents.on('did-finish-load', () => {
    indicatorWindow?.show();
  });

  indicatorWindow.on('closed', () => {
    indicatorWindow = null;
  });
}

export function closeRecordingIndicator(): void {
  if (indicatorWindow) {
    indicatorWindow.close();
    indicatorWindow = null;
  }
}
