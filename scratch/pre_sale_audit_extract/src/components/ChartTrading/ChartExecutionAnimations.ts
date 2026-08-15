/**
 * ChartExecutionAnimations.ts
 * Manages entry-line slide animations, fill flashes, and execution markers
 * using only canvas/DOM – no React – for guaranteed 60 FPS.
 */

export interface ExecutionMarker {
  id: string;
  price: number;
  side: 'buy' | 'sell';
  quantity: number;
  symbol: string;
  timestamp: number;
}

const activeMarkers: Map<string, { el: HTMLElement; timer: ReturnType<typeof setTimeout> }> = new Map();

export const ChartExecutionAnimations = {
  /** Flash a brief fill marker at the chart edge when an order executes */
  flashFill(symbol: string, side: 'buy' | 'sell', quantity: number, price: number): void {
    const id = `fill_${Date.now()}`;
    const color = side === 'buy' ? '#00c076' : '#ff4d57';
    const label = `${side.toUpperCase()} ${quantity} @ ${price.toFixed(2)}`;

    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = `
      position: fixed;
      bottom: 120px;
      right: 24px;
      z-index: 9999;
      padding: 6px 14px;
      border-radius: 6px;
      background: ${color};
      color: #ffffff;
      font-family: 'Inter', monospace;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.3px;
      box-shadow: 0 0 24px ${color}80, 0 4px 16px rgba(0,0,0,0.5);
      pointer-events: none;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.15s ease, transform 0.15s ease;
    `;
    el.textContent = `✓ ${label}`;
    document.body.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });

    // Animate out after 1.8s
    const timer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 200);
      activeMarkers.delete(id);
    }, 1800);

    activeMarkers.set(id, { el, timer });
  },

  /** Clean up all active markers (e.g. on unmount) */
  cleanup(): void {
    activeMarkers.forEach(({ el, timer }) => {
      clearTimeout(timer);
      el.remove();
    });
    activeMarkers.clear();
  },
};
