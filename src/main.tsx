import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

console.log("FRONTEND BUILD VERSION:", new Date().toISOString());
// @ts-ignore
console.log("FRONTEND COMPILE TIME:", __BUILD_TIME__);
// @ts-ignore
window.__APP_VERSION__ = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '1.0.0-dev';

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[SW] Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('[SW] Service Worker registration failed:', err);
      });
  });
}

// Capture first runtime error before Vite's HMR loop hides it
window.addEventListener('error', (e) => {
  console.error('[FIRST RUNTIME ERROR]', e.message, '\nFile:', e.filename, '\nLine:', e.lineno, '\nStack:', e.error?.stack);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UNHANDLED REJECTION]', e.reason);
});

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // StrictMode intentionally double-invokes effects in dev, which can cause
  // duplicate WebSocket connections and race conditions. Removed for stability.
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
