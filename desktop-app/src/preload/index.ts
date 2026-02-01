import { contextBridge, ipcRenderer } from 'electron';

interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId: number;
}

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:set', settings),

  // Capture actions
  startCapture: () => ipcRenderer.invoke('capture:start'),
  stopCapture: () => ipcRenderer.invoke('capture:stop'),

  // Window actions
  hideWindow: () => ipcRenderer.send('window:hide'),
  showWindow: () => ipcRenderer.send('window:show'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),

  // Overlay actions
  completeOverlay: (bounds: SelectionBounds) => ipcRenderer.invoke('overlay:complete', bounds),
  cancelOverlay: () => ipcRenderer.invoke('overlay:cancel'),

  // Event listeners
  onCaptureStart: (callback: () => void) => {
    ipcRenderer.on('capture:started', callback);
    return () => ipcRenderer.removeListener('capture:started', callback);
  },
  onCaptureComplete: (callback: (url: string) => void) => {
    ipcRenderer.on('capture:complete', (_event, url) => callback(url));
    return () => ipcRenderer.removeListener('capture:complete', () => {});
  },
  onCaptureError: (callback: (error: string) => void) => {
    ipcRenderer.on('capture:error', (_event, error) => callback(error));
    return () => ipcRenderer.removeListener('capture:error', () => {});
  },
  onOverlayInit: (callback: (event: unknown, data: unknown) => void) => {
    ipcRenderer.on('overlay:init', callback);
    return () => ipcRenderer.removeListener('overlay:init', callback);
  },
});

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<Record<string, unknown>>;
      setSettings: (settings: Record<string, unknown>) => Promise<void>;
      startCapture: () => Promise<void>;
      stopCapture: () => Promise<void>;
      hideWindow: () => void;
      showWindow: () => void;
      getVersion: () => Promise<string>;
      completeOverlay: (bounds: SelectionBounds) => Promise<void>;
      cancelOverlay: () => Promise<void>;
      onCaptureStart: (callback: () => void) => () => void;
      onCaptureComplete: (callback: (url: string) => void) => () => void;
      onCaptureError: (callback: (error: string) => void) => () => void;
      onOverlayInit: (callback: (event: unknown, data: unknown) => void) => () => void;
    };
  }
}
