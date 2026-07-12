import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

console.log("FRONTEND BUILD VERSION:", new Date().toISOString());
// @ts-ignore
console.log("FRONTEND COMPILE TIME:", __BUILD_TIME__);

// Auto-cleanup stale service workers and caches from other localhost projects
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('[SW] Stale Service Worker unregistered');
      });
    }
  });
}
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => {
      caches.delete(key).then(() => {
        console.log('[Cache] Stale cache cleared:', key);
      });
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
