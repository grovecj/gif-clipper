import React, { useState, useEffect, useCallback } from 'react';
import './Countdown.css';

const Countdown: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Listen for initialization
    const handleInit = (_event: unknown, data: { duration: number }) => {
      setCount(data.duration);
    };

    window.electronAPI.onCountdownInit(handleInit);

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.cancelCountdown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (count === null) return;

    if (count <= 0) {
      setIsComplete(true);
      // Small delay before completing to show "Recording" state
      const timeout = setTimeout(() => {
        window.electronAPI.completeCountdown();
      }, 500);
      return () => clearTimeout(timeout);
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count]);

  if (count === null) {
    return null;
  }

  return (
    <div className="countdown-container">
      <div className="countdown-circle">
        {isComplete ? (
          <div className="countdown-recording">
            <div className="recording-dot" />
            <span>REC</span>
          </div>
        ) : (
          <span className="countdown-number">{count}</span>
        )}
      </div>
      {!isComplete && <p className="countdown-hint">Press ESC to cancel</p>}
    </div>
  );
};

export default Countdown;
