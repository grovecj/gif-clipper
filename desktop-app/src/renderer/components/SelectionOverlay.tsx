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

  useEffect(() => {
    // Listen for initialization data from main process
    const handleInit = (_event: unknown, data: OverlayInitData) => {
      setDisplays(data.displays);
      setCombinedBounds(data.combinedBounds);
    };

    window.electronAPI.onOverlayInit(handleInit);

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.cancelOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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

  const getDisplayForPoint = useCallback((x: number, y: number): DisplayInfo | null => {
    if (!combinedBounds) return null;

    // Convert screen coordinates to global coordinates
    const globalX = x + combinedBounds.x;
    const globalY = y + combinedBounds.y;

    for (const display of displays) {
      if (
        globalX >= display.bounds.x &&
        globalX < display.bounds.x + display.bounds.width &&
        globalY >= display.bounds.y &&
        globalY < display.bounds.y + display.bounds.height
      ) {
        return display;
      }
    }
    return displays[0] || null;
  }, [displays, combinedBounds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelecting) {
      setCurrentPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isSelecting]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !startPoint || !combinedBounds) return;

    setIsSelecting(false);
    const endPoint = { x: e.clientX, y: e.clientY };

    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    // Minimum selection size
    if (width < 10 || height < 10) {
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }

    // Convert to global screen coordinates
    const globalX = x + combinedBounds.x;
    const globalY = y + combinedBounds.y;

    // Find which display contains the center of the selection
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const display = getDisplayForPoint(centerX, centerY);

    const bounds: SelectionBounds = {
      x: globalX,
      y: globalY,
      width,
      height,
      displayId: display?.id || 0,
    };

    window.electronAPI.completeOverlay(bounds);
  }, [isSelecting, startPoint, combinedBounds, getDisplayForPoint]);

  const selectionRect = getSelectionRect();

  return (
    <div
      ref={containerRef}
      className="selection-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Dark overlay with cutout for selection */}
      <svg className="overlay-svg" width="100%" height="100%">
        <defs>
          <mask id="selection-mask">
            <rect width="100%" height="100%" fill="white" />
            {selectionRect && (
              <rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#selection-mask)"
        />
      </svg>

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
            {selectionRect.width} × {selectionRect.height}
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
