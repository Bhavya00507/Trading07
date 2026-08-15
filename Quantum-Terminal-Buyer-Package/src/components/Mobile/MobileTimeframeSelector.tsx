import React from 'react';

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '1H', '4H', '1D', '1W'];

interface MobileTimeframeSelectorProps {
  selectedTf: string;
  onSelectTf: (tf: string) => void;
}

export const MobileTimeframeSelector: React.FC<MobileTimeframeSelectorProps> = React.memo(({
  selectedTf,
  onSelectTf,
}) => {
  return (
    <div className="quantum-row-2-timeframes">
      <div className="tf-scroll-strip">
        {TIMEFRAMES.map((tf) => {
          const isActive = (selectedTf || '1m').toLowerCase() === tf.toLowerCase();
          return (
            <button
              key={tf}
              type="button"
              className={`tf-pill ${isActive ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTf(tf);
              }}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </div>
  );
});

MobileTimeframeSelector.displayName = 'MobileTimeframeSelector';
