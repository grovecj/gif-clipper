import React, { useState, useEffect, useCallback, useRef } from 'react';

interface DisplayInfo {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
}

interface OverlayInitData {
  displays: DisplayInfo[];
  combinedBounds: { x: number; y: number; width: number; height: number };
}

interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId: number;
}

const SelectionOverlay: React.FC = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [combinedBounds, setCombinedBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for values needed in mouseup to avoid stale closure issues
  const isSelectingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const combinedBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const displaysRef = useRef<DisplayInfo[]>([]);

  // Keep refs in sync with state
  isSelectingRef.current = isSelecting;
  startPointRef.current = startPoint;
  combinedBoundsRef.current = combinedBounds;
  displaysRef.current = displays;

  useEffect(() => {
    const applyInitData = (data: OverlayInitData) => {
      setDisplays(data.displays);
      setCombinedBounds(data.combinedBounds);
    };

    // Poll for init data injected via executeJavaScript from main process
    // This works regardless of whether the preload/electronAPI is available
    const checkForInjectedData = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).__overlayInitData as OverlayInitData | undefined;
      if (data) {
        applyInitData(data);
        return true;
      }
      return false;
    };

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!checkForInjectedData()) {
      // Data not ready yet, poll briefly
      pollTimer = setInterval(() => {
        if (checkForInjectedData() && pollTimer) {
          clearInterval(pollTimer);
        }
      }, 50);
      // Stop polling after 3 seconds
      pollTimeout = setTimeout(() => {
        if (pollTimer) clearInterval(pollTimer);
      }, 3000);
    }

    // Also try IPC if electronAPI is available
    if (window.electronAPI) {
      window.electronAPI.onOverlayInit((_event: unknown, data: OverlayInitData) => {
        applyInitData(data);
      });
    }

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (window.electronAPI) {
          window.electronAPI.cancelOverlay();
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__overlayResult = null;
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

  const getSelectionRect = useCallback(() => {
    if (!startPoint || !currentPoint) return null;

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    return { x, y, width, height };
  }, [startPoint, currentPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelectingRef.current) {
      setCurrentPoint({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isSelectingRef.current || !startPointRef.current) return;

    // Always reset selecting state
    setIsSelecting(false);

    const sp = startPointRef.current;
    const endPoint = { x: e.clientX, y: e.clientY };
    const cb = combinedBoundsRef.current;

    const x = Math.min(sp.x, endPoint.x);
    const y = Math.min(sp.y, endPoint.y);
    const width = Math.abs(endPoint.x - sp.x);
    const height = Math.abs(endPoint.y - sp.y);

    // Minimum selection size
    if (width < 10 || height < 10) {
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }

    if (!cb) {
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }

    // Convert to global screen coordinates
    const globalX = x + cb.x;
    const globalY = y + cb.y;

    // Find which display contains the center of the selection
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const globalCenterX = centerX + cb.x;
    const globalCenterY = centerY + cb.y;

    let display: DisplayInfo | null = null;
    for (const d of displaysRef.current) {
      if (
        globalCenterX >= d.bounds.x &&
        globalCenterX < d.bounds.x + d.bounds.width &&
        globalCenterY >= d.bounds.y &&
        globalCenterY < d.bounds.y + d.bounds.height
      ) {
        display = d;
        break;
      }
    }
    if (!display) display = displaysRef.current[0] || null;

    const bounds: SelectionBounds = {
      x: globalX,
      y: globalY,
      width,
      height,
      displayId: display?.id || 0,
    };

    if (window.electronAPI) {
      window.electronAPI.completeOverlay(bounds);
    } else {
      // Fallback: post result for main process to pick up via executeJavaScript polling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__overlayResult = bounds;
    }
  }, []);

  const selectionRect = getSelectionRect();

  return (
    <div
      ref={containerRef}
      className="selection-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Selection border */}
      {selectionRect && selectionRect.width > 0 && selectionRect.height > 0 && (
        <>
          <div
            className="selection-border"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
          {/* Dimension label */}
          <div
            className="dimension-label"
            style={{
              left: selectionRect.x + selectionRect.width / 2,
              top: selectionRect.y + selectionRect.height + 10,
            }}
          >
            {selectionRect.width} &times; {selectionRect.height}
          </div>
        </>
      )}

      {/* Instructions */}
      {!isSelecting && !selectionRect && (
        <div className="instructions">
          <p>Click and drag to select a region</p>
          <p className="hint">Press ESC to cancel</p>
        </div>
      )}
    </div>
  );
};

export default SelectionOverlay;
