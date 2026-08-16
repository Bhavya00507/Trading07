/**
 * config.ts — Centralized Production & Development API / WebSocket URL resolver.
 * Dynamically adapts to local desktop development, LAN mobile IP access, and production deployments.
 */
export const getApiUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

  // 1. Explicit VITE_API_BASE_URL environment variable takes highest priority
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Browser runtime adaptation (Desktop localhost or Mobile LAN IP)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    
    // Dynamically bind to current client hostname on port 8000
    return `${protocol}//${hostname}:8000`;
  }

  // 3. Fallback for SSR / Node / Electron environments
  return 'http://127.0.0.1:8000';
};

export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
  return apiUrl.replace(/^http[s]?:/, wsProtocol);
};
