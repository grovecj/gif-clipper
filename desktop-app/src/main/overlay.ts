import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'node:path';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId: number;
}

let overlayWindow: BrowserWindow | null = null;
let selectionResolver: ((bounds: SelectionBounds | null) => void) | null = null;

export const createOverlayWindow = (): BrowserWindow => {
  // Get the combined bounds of all displays
  const displays = screen.getAllDisplays();
  const combinedBounds = getCombinedDisplayBounds(displays);

  console.log('Creating overlay window with bounds:', combinedBounds);

  // On Linux/WSL, transparent windows may not work properly
  const isLinux = process.platform === 'linux';

  overlayWindow = new BrowserWindow({
    x: combinedBounds.x,
    y: combinedBounds.y,
    width: combinedBounds.width,
    height: combinedBounds.height,
    frame: false,
    transparent: !isLinux, // Disable transparency on Linux/WSL
    backgroundColor: isLinux ? '#01000000' : undefined, // Near-transparent black on Linux
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  console.log('Overlay window created, loading URL...');

  // Load the overlay page
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/overlay`);
  } else {
    overlayWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash: '/overlay' }
    );
  }

  // Send display info to the overlay
  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('Overlay window loaded, sending init data');
    overlayWindow?.webContents.send('overlay:init', {
      displays: displays.map(d => ({
        id: d.id,
        bounds: d.bounds,
        scaleFactor: d.scaleFactor,
      })),
      combinedBounds,
    });
    overlayWindow?.show();
    overlayWindow?.focus();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    if (selectionResolver) {
      selectionResolver(null);
      selectionResolver = null;
    }
  });

  return overlayWindow;
};

const getCombinedDisplayBounds = (displays: Electron.Display[]) => {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const display of displays) {
    minX = Math.min(minX, display.bounds.x);
    minY = Math.min(minY, display.bounds.y);
    maxX = Math.max(maxX, display.bounds.x + display.bounds.width);
    maxY = Math.max(maxY, display.bounds.y + display.bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const startRegionSelection = (): Promise<SelectionBounds | null> => {
  return new Promise((resolve) => {
    selectionResolver = resolve;
    createOverlayWindow();
  });
};

export const closeOverlay = (): void => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
};

// IPC handlers for overlay
export const registerOverlayIPC = (): void => {
  ipcMain.handle('overlay:complete', (_event, bounds: SelectionBounds | null) => {
    if (selectionResolver) {
      selectionResolver(bounds);
      selectionResolver = null;
    }
    closeOverlay();
  });

  ipcMain.handle('overlay:cancel', () => {
    if (selectionResolver) {
      selectionResolver(null);
      selectionResolver = null;
    }
    closeOverlay();
  });
};
