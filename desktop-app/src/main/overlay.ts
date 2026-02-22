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

interface OverlayInitData {
  displays: {
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
  }[];
  combinedBounds: { x: number; y: number; width: number; height: number };
}

let overlayWindow: BrowserWindow | null = null;
let selectionResolver: ((bounds: SelectionBounds | null) => void) | null = null;
let overlayInitData: OverlayInitData | null = null;

export const createOverlayWindow = (): BrowserWindow => {
  // Use the display where the cursor is currently located
  const cursorPoint = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const displayBounds = activeDisplay.bounds;

  console.log('Creating overlay window on display:', activeDisplay.id, 'bounds:', displayBounds);

  overlayWindow = new BrowserWindow({
    x: displayBounds.x,
    y: displayBounds.y,
    width: displayBounds.width,
    height: displayBounds.height,
    frame: false,
    show: false,
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

  // Store init data so the renderer can request it
  overlayInitData = {
    displays: [{
      id: activeDisplay.id,
      bounds: activeDisplay.bounds,
      scaleFactor: activeDisplay.scaleFactor,
    }],
    combinedBounds: displayBounds,
  };

  // Forward renderer console logs to main process terminal
  overlayWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log('[overlay-renderer]', message);
  });

  // Send display info to the overlay
  let ipcFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let resultPoller: ReturnType<typeof setInterval> | null = null;

  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('Overlay window loaded, sending init data');

    // Inject init data directly into the window object — this works
    // even if the preload/electronAPI isn't available
    const initDataJson = JSON.stringify(overlayInitData);
    overlayWindow?.webContents.executeJavaScript(
      `window.__overlayInitData = ${initDataJson};`
    );

    overlayWindow?.setOpacity(0.5);
    overlayWindow?.show();
    overlayWindow?.focus();

    // Also try IPC push with delay as a fallback
    ipcFallbackTimer = setTimeout(() => {
      overlayWindow?.webContents.send('overlay:init', overlayInitData);
    }, 150);

    // Poll for __overlayResult set by renderer (fallback when electronAPI unavailable)
    resultPoller = setInterval(async () => {
      if (!overlayWindow) {
        if (resultPoller) clearInterval(resultPoller);
        return;
      }
      try {
        const result = await overlayWindow.webContents.executeJavaScript(
          `(() => { const r = window.__overlayResult; if (r !== undefined) { delete window.__overlayResult; return r; } return undefined; })()`
        );
        if (result !== undefined) {
          if (resultPoller) clearInterval(resultPoller);
          if (selectionResolver) {
            selectionResolver(result);
            selectionResolver = null;
          }
          closeOverlay();
        }
      } catch {
        // Window may have been closed
        if (resultPoller) clearInterval(resultPoller);
      }
    }, 100);
  });

  overlayWindow.on('closed', () => {
    if (ipcFallbackTimer) clearTimeout(ipcFallbackTimer);
    if (resultPoller) clearInterval(resultPoller);
    overlayWindow = null;
    if (selectionResolver) {
      selectionResolver(null);
      selectionResolver = null;
    }
  });

  return overlayWindow;
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
