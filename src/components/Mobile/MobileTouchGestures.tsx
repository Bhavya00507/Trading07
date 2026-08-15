import React, { useRef, useEffect } from 'react';

interface MobileTouchGesturesProps {
  children: React.ReactNode;
  onDoubleTapReset?: () => void;
  onLongPress?: (e: React.TouchEvent) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinchZoom?: (scaleDelta: number) => void;
}

export const MobileTouchGestures: React.FC<MobileTouchGesturesProps> = React.memo(({
  children,
  onDoubleTapReset,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  onPinchZoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  let lastTapTime = 0;
  let longPressTimer: any = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let initialPinchDistance = 0;

  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;

      // Double Tap detection
      const now = Date.now();
      if (now - lastTapTime < 300) {
        if (onDoubleTapReset) onDoubleTapReset();
        if (longPressTimer) clearTimeout(longPressTimer);
        lastTapTime = 0;
        return;
      }
      lastTapTime = now;

      // Long Press detection
      longPressTimer = setTimeout(() => {
        if (onLongPress) onLongPress(e);
      }, 500);
    } else if (e.touches.length === 2) {
      if (longPressTimer) clearTimeout(longPressTimer);
      initialPinchDistance = getDistance(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        if (longPressTimer) clearTimeout(longPressTimer);
      }
    } else if (e.touches.length === 2 && initialPinchDistance > 0) {
      const currentDist = getDistance(e.touches);
      const delta = currentDist - initialPinchDistance;
      if (Math.abs(delta) > 15) {
        if (onPinchZoom) onPinchZoom(delta > 0 ? 1.05 : 0.95);
        initialPinchDistance = currentDist;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer) clearTimeout(longPressTimer);

    // Prevent chart touches/drags from triggering bottom sheet swipes
    const target = e.target as HTMLElement;
    if (target && target.closest('.main-chart-canvas-container, canvas, .tv-lightweight-charts')) {
      return;
    }

    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const dx = touchEndX - touchStartX;

      if (Math.abs(dx) > 60) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        if (dx > 0 && onSwipeRight) onSwipeRight();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="quantum-touch-gestures-wrapper"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {children}
    </div>
  );
});

MobileTouchGestures.displayName = 'MobileTouchGestures';
