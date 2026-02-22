import React, { useState, useEffect, useCallback } from 'react';
import './RecordingIndicator.css';

const RecordingIndicator: React.FC = () => {
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  // Make body transparent so the transparent BrowserWindow works
  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Escape key to stop
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI?.stopCapture();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStop = useCallback(() => {
    window.electronAPI?.stopCapture();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="recording-indicator" />
      <div className="recording-stop-bar" onClick={handleStop}>
        <div className="recording-dot-indicator" />
        <span className="recording-timer">{formatTime(elapsed)}</span>
        <div className="recording-stop-btn" />
      </div>
    </>
  );
};

export default RecordingIndicator;
