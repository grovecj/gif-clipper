import { globalShortcut } from 'electron';
import Store from 'electron-store';
import type { AppSettings } from './store';

export const registerGlobalShortcuts = (
  store: Store<AppSettings>,
  onStartCapture: () => void
): void => {
  const startCaptureKey = store.get('hotkeys.startCapture', 'CommandOrControl+Shift+G');

  const registered = globalShortcut.register(startCaptureKey, () => {
    console.log('Start capture hotkey pressed');
    onStartCapture();
  });

  if (!registered) {
    console.error(`Failed to register global shortcut: ${startCaptureKey}`);
  } else {
    console.log(`Registered global shortcut: ${startCaptureKey}`);
  }
};

export const unregisterAllShortcuts = (): void => {
  globalShortcut.unregisterAll();
};
