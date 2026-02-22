import React, { useState, useEffect, useCallback } from 'react';
import './Countdown.css';

const Countdown: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Make body transparent so the transparent BrowserWindow works
  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';
  }, []);

  useEffect(() => {
    // Poll for init data injected via executeJavaScript
    const checkForInjectedData = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).__countdownInitData as { duration: number } | undefined;
      if (data) {
        setCount(data.duration);
        return true;
      }
      return false;
    };

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!checkForInjectedData()) {
      pollTimer = setInterval(() => {
        if (checkForInjectedData() && pollTimer) clearInterval(pollTimer);
      }, 50);
      pollTimeout = setTimeout(() => {
        if (pollTimer) clearInterval(pollTimer);
      }, 3000);
    }

    // Also try IPC if available
    if (window.electronAPI) {
      window.electronAPI.onCountdownInit((_event: unknown, data: { duration: number }) => {
        setCount(data.duration);
      });
    }

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (window.electronAPI) {
          window.electronAPI.cancelCountdown();
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__countdownResult = 'cancel';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pollTimer) clearInterval(pollTimer);
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (count === null) return;

    if (count <= 0) {
      setIsComplete(true);
      // Small delay before completing to show "Recording" state
      const timeout = setTimeout(() => {
        if (window.electronAPI) {
          window.electronAPI.completeCountdown();
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__countdownResult = 'complete';
        }
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
