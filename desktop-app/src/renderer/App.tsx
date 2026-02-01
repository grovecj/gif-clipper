import React, { useEffect, useState } from 'react';
import SelectionOverlay from './components/SelectionOverlay';
import './components/SelectionOverlay.css';

const MainApp: React.FC = () => {
  const handleStartCapture = () => {
    window.electronAPI.startCapture();
  };

  const handleHide = () => {
    window.electronAPI.hideWindow();
  };

  return (
    <div className="app">
      <header>
        <h1>Gif Clipper</h1>
      </header>

      <main>
        <p className="hint">
          Press <kbd>Ctrl+Shift+G</kbd> to start a capture
        </p>

        <div className="actions">
          <button onClick={handleStartCapture} className="btn btn-primary">
            Start Capture
          </button>
          <button onClick={handleHide} className="btn btn-secondary">
            Hide to Tray
          </button>
        </div>
      </main>

      <footer>
        <p>Right-click the tray icon for more options</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Route based on hash
  if (route === '#/overlay') {
    return <SelectionOverlay />;
  }

  return <MainApp />;
};

export default App;
