import Store from 'electron-store';

export interface AppSettings {
  hotkeys: {
    startCapture: string;
    stopCapture: string;
  };
  countdown: {
    duration: number;
    soundEnabled: boolean;
  };
  recording: {
    fps: number;
    maxDuration: number;
  };
  encoding: {
    quality: 'low' | 'medium' | 'high';
    colors: number;
  };
  upload: {
    apiUrl: string;
    copyToClipboard: boolean;
    showNotification: boolean;
    openInBrowser: boolean;
  };
}

const defaultSettings: AppSettings = {
  hotkeys: {
    startCapture: 'CommandOrControl+Shift+G',
    stopCapture: 'Escape',
  },
  countdown: {
    duration: 3,
    soundEnabled: true,
  },
  recording: {
    fps: 15,
    maxDuration: 30,
  },
  encoding: {
    quality: 'high',
    colors: 256,
  },
  upload: {
    apiUrl: 'https://gif-api.cartergrove.me',
    copyToClipboard: true,
    showNotification: true,
    openInBrowser: false,
  },
};

export const createStore = (): Store<AppSettings> => {
  return new Store<AppSettings>({
    defaults: defaultSettings,
    schema: {
      hotkeys: {
        type: 'object',
        properties: {
          startCapture: { type: 'string' },
          stopCapture: { type: 'string' },
        },
      },
      countdown: {
        type: 'object',
        properties: {
          duration: { type: 'number', minimum: 0, maximum: 10 },
          soundEnabled: { type: 'boolean' },
        },
      },
      recording: {
        type: 'object',
        properties: {
          fps: { type: 'number', minimum: 5, maximum: 30 },
          maxDuration: { type: 'number', minimum: 5, maximum: 60 },
        },
      },
      encoding: {
        type: 'object',
        properties: {
          quality: { type: 'string', enum: ['low', 'medium', 'high'] },
          colors: { type: 'number', minimum: 16, maximum: 256 },
        },
      },
      upload: {
        type: 'object',
        properties: {
          apiUrl: { type: 'string' },
          copyToClipboard: { type: 'boolean' },
          showNotification: { type: 'boolean' },
          openInBrowser: { type: 'boolean' },
        },
      },
    },
  });
};
