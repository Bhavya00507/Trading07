/**
 * config.ts — Centralized Production & Development API / WebSocket URL resolver.
 * Dynamically adapts to local development, LAN mobile IP access, and production deployments.
 */
export const getApiUrl = (): string => {
  // 1. Check build-time environment variable VITE_API_BASE_URL
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl && !envUrl.includes('trading07-backend.onrender.com')) {
    return envUrl;
  }

  // 2. If running in browser, adapt dynamically to current hostname (Desktop or Mobile LAN IP)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    
    // Always use current hostname for backend API port 8000
    return `${protocol}//${hostname}:8000`;
  }

  // Default fallback for node / SSR environments
  return 'http://127.0.0.1:8000';
};

export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  return apiUrl.replace(/^http[s]?/, wsProtocol);
};
