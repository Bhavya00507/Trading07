/**
 * ChartHotkeys.ts
 * Registers all keyboard shortcuts for chart trading.
 * Attaches to window. Safe to call/destroy from component lifecycle.
 */

export interface HotkeyConfig {
  onBuy: () => void;
  onSell: () => void;
  onCancel: () => void;
  onClosePosition: () => void;
  onReverse: () => void;
  onFlatten: () => void;
  onCloseWinners: () => void;
  onCloseLoosers: () => void;
}

let _cfg: HotkeyConfig | null = null;

const handler = (e: KeyboardEvent) => {
  if (!_cfg) return;
  // Ignore if focus is in an input / textarea
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  switch (true) {
    case e.code === 'KeyB' && !e.shiftKey && !e.ctrlKey && !e.altKey:
      e.preventDefault(); _cfg.onBuy(); break;
    case e.code === 'KeyS' && !e.shiftKey && !e.ctrlKey && !e.altKey:
      e.preventDefault(); _cfg.onSell(); break;
    case e.code === 'Escape':
      e.preventDefault(); _cfg.onCancel(); break;
    case e.code === 'Delete':
      e.preventDefault(); _cfg.onClosePosition(); break;
    case e.code === 'KeyR' && !e.shiftKey && !e.ctrlKey && !e.altKey:
      e.preventDefault(); _cfg.onReverse(); break;
    case e.code === 'KeyF' && !e.shiftKey && !e.ctrlKey:
      e.preventDefault(); _cfg.onFlatten(); break;
    case e.code === 'KeyF' && e.shiftKey:
      e.preventDefault(); _cfg.onCloseWinners(); break;
    case e.code === 'KeyF' && e.ctrlKey:
      e.preventDefault(); _cfg.onCloseLoosers(); break;
  }
};

export const ChartHotkeys = {
  mount(cfg: HotkeyConfig) {
    _cfg = cfg;
    window.addEventListener('keydown', handler);
  },
  update(cfg: HotkeyConfig) {
    _cfg = cfg;
  },
  unmount() {
    _cfg = null;
    window.removeEventListener('keydown', handler);
  },
};
