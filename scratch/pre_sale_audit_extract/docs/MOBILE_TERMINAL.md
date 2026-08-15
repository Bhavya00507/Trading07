# Quantum Terminal — Quantum Mobile Pro Specification

## Overview
**Quantum Mobile Pro** (`MobileLayout.tsx`, `QuantumMenu.tsx`) provides an institutional-grade mobile trading interface tailored for touch-screen viewports (320px–414px+).

---

## 1. Touch Gesture Architecture (`MobileTouchGestures.tsx`)

- **Canvas Gesture Ownership**: Touch events occurring on `.main-chart-canvas-container, canvas, .tv-lightweight-charts` are passed directly through to the chart canvas element (`touch-action: none`).
- **Vertical & Horizontal Chart Dragging**: Enabled via `handleScroll.vertTouchDrag: true` and `handleScroll.horzTouchDrag: true`. Allows touch panning of visible price and time scales simultaneously.
- **Pinch Zoom**: Axis and pinch scaling are handled natively by the chart canvas.
- **Scroll Isolation**: Chart canvas interactions are isolated from page scrolling and bottom sheets, preventing accidental sheet triggers while analyzing charts.

---

## 2. Component Layout

```text
┌─────────────────────────────────┐
│ HEADER: SYMBOL | SEARCH | MENU  │
├─────────────────────────────────┤
│ TIMEFRAME SELECTION BAR (1m-1W) │
├─────────────────────────────────┤
│ MAIN CHART CANVAS (60vh)        │
│ ├── Candlestick Series          │
│ ├── Event Overlay (CPI/FOMC)    │
│ └── Time Axis (26px)            │
├─────────────────────────────────┤
│ ACTIVE POSITIONS CARD           │
├─────────────────────────────────┤
│ MARKET CATALYSTS & NEWS         │
├─────────────────────────────────┤
│ STICKY BOTTOM NAVIGATION BAR    │
└─────────────────────────────────┘
```

---

## 3. Quantum Menu Slide-Out Drawer

Accessed via the `☰ MENU` trigger button. Renders a dark slide-out navigation panel providing:
- Account Equity, Balance, and Free Margin summary
- Preset Workspace switcher
- Intelligence tools (AI Copilot, Economic Calendar)
- System preferences and account sign-out
