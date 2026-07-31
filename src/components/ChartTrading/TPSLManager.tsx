/**
 * TPSLManager.tsx
 * Manual TP/SL placement state machine.
 * When active, cursor becomes crosshair.
 * Next click on chart places the line.
 * ESC cancels. Delete removes selected line.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { modifySLTP } from '../../services/api';

export type TPSLPlacementMode = 'sl' | 'tp' | null;

interface TPSLManagerProps {
  /** Whether placement mode is active */
  placingMode: TPSLPlacementMode;
  /** Call after each state change so parent can reset */
  onModeChange: (mode: TPSLPlacementMode) => void;
  /** Converts screen Y → price */
  yToPrice: (y: number) => number;
  /** Symbol for the position being managed */
  symbol: string;
  positionId?: string;
  /** Currently set values (for display) */
  currentSL?: number;
  currentTP?: number;
  /** Called when placement succeeds so parent can refresh */
  onPlaced: (type: 'sl' | 'tp', price: number) => void;
}

/** Overlay cursor crosshair that listens for click-to-place */
export const TPSLManager: React.FC<TPSLManagerProps> = ({
  placingMode,
  onModeChange,
  yToPrice,
  symbol,
  positionId,
  onPlaced,
}) => {
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC to cancel
  useEffect(() => {
    if (!placingMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onModeChange(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [placingMode, onModeChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setHoverPrice(yToPrice(y));
  }, [yToPrice]);

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const price = yToPrice(y);

    onModeChange(null);
    setHoverPrice(null);

    try {
      if (placingMode === 'sl') {
        await modifySLTP(symbol, price, undefined, positionId);
        onPlaced('sl', price);
      } else {
        await modifySLTP(symbol, undefined, price, positionId);
        onPlaced('tp', price);
      }
    } catch (e) {
      console.error('[TPSLManager] Place error', e);
    }
  }, [placingMode, yToPrice, symbol, positionId, onModeChange, onPlaced]);

  if (!placingMode) return null;

  const isSL = placingMode === 'sl';
  const color = isSL ? '#ff4d57' : '#00c076';
  const label = isSL ? 'Click to place Stop Loss' : 'Click to place Take Profit';

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        cursor: 'crosshair',
        pointerEvents: 'auto',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverPrice(null)}
      onClick={handleClick}
    >
      {/* Horizontal guide line at cursor */}
      {hoverPrice !== null && (
        <>
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 1,
            background: color,
            opacity: 0.6,
            pointerEvents: 'none',
            // We can't use hoverPrice directly without priceToY; parent computes Y
          }} />
          {/* Instructions banner */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '5px 14px',
            borderRadius: 20,
            background: `${color}22`,
            border: `1px solid ${color}60`,
            color,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.3px',
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
            boxShadow: `0 4px 16px ${color}20`,
          }}>
            {label} · {hoverPrice.toFixed(2)} · ESC to cancel
          </div>
        </>
      )}
    </div>
  );
};
