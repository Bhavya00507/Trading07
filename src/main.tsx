import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

console.log("FRONTEND BUILD VERSION:", new Date().toISOString());
// @ts-ignore
console.log("FRONTEND COMPILE TIME:", typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev');

// Unregister stale service workers in localhost / dev to prevent MIME hash mismatch errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Capture first runtime error
window.addEventListener('error', (e) => {
  console.error('[FIRST RUNTIME ERROR]', e.message, '\nFile:', e.filename, '\nLine:', e.lineno, '\nStack:', e.error?.stack);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UNHANDLED REJECTION]', e.reason);
});

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
