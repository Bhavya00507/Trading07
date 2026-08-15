import React, { useState } from 'react';

interface MobileDrawingToolbarProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectTool?: (toolName: string) => void;
}

export const MobileDrawingToolbar: React.FC<MobileDrawingToolbarProps> = React.memo(({
  isVisible,
  onClose,
  onSelectTool,
}) => {
  const [activeTool, setActiveTool] = useState<string>('trendline');

  if (!isVisible) return null;

  const tools = [
    { id: 'trendline', label: 'Trendline', icon: '╱' },
    { id: 'fib', label: 'Fib Retracement', icon: '≡' },
    { id: 'rectangle', label: 'Rectangle Zone', icon: '▭' },
    { id: 'text', label: 'Text Note', icon: 'T' },
    { id: 'brush', label: 'Free Brush', icon: '✎' },
    { id: 'riskreward', label: 'Risk / Reward Box', icon: '⚖' },
    { id: 'measure', label: 'Ruler / Measure', icon: '📏' },
  ];

  const handleSelect = (id: string) => {
    setActiveTool(id);
    if (onSelectTool) onSelectTool(id);
  };

  return (
    <div className="quantum-floating-drawing-bar">
      <button className="drawing-close-btn" onClick={onClose} title="Close Drawings">✕</button>
      <div className="drawing-tools-list">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`drawing-tool-btn ${activeTool === t.id ? 'active' : ''}`}
            onClick={() => handleSelect(t.id)}
            title={t.label}
          >
            <span className="tool-icon">{t.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

MobileDrawingToolbar.displayName = 'MobileDrawingToolbar';
