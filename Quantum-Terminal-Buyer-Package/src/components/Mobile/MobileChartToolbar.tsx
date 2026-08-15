import React from 'react';

interface MobileChartToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
  isReplayActive?: boolean;
  onToggleReplay?: () => void;
  isDrawingActive?: boolean;
  onToggleDrawing?: () => void;
  onOpenIndicators?: () => void;
}

export const MobileChartToolbar: React.FC<MobileChartToolbarProps> = React.memo(({
  onUndo,
  onRedo,
  onReset,
  isReplayActive,
  onToggleReplay,
  isDrawingActive,
  onToggleDrawing,
  onOpenIndicators,
}) => {
  return (
    <div className="quantum-row-3-chart-tools">
      <div className="tools-cluster">
        <button className="tool-btn" onClick={onUndo} title="Undo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </svg>
        </button>

        <button className="tool-btn" onClick={onRedo} title="Redo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 14l5-5-5-5" />
            <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
          </svg>
        </button>

        <button className="tool-btn" onClick={onReset} title="Reset View">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button className={`tool-btn ${isReplayActive ? 'active' : ''}`} onClick={onToggleReplay} title="Replay">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        <button className={`tool-btn ${isDrawingActive ? 'active' : ''}`} onClick={onToggleDrawing} title="Drawings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>

        <button className="tool-btn" onClick={onOpenIndicators} title="Indicators">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </button>
      </div>
    </div>
  );
});

MobileChartToolbar.displayName = 'MobileChartToolbar';
