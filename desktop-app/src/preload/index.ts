import { contextBridge, ipcRenderer } from 'electron';

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
      onCaptureStart: (callback: () => void) => () => void;
      onCaptureComplete: (callback: (url: string) => void) => () => void;
      onCaptureError: (callback: (error: string) => void) => () => void;
    };
  }
}
