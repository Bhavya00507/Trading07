/**
 * config.ts — Centralized Production & Development API / WebSocket URL resolver.
 * Dynamically adapts to local desktop development, LAN mobile IP access, and production deployments.
 */
export const getApiUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL;

  // 1. Explicit VITE_API_URL / VITE_API_BASE_URL environment variable takes highest priority
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Browser runtime adaptation (Desktop localhost or Mobile LAN IP or Cloud Production)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';

    // Cloud Production Hostnames (Vercel, Render, Netlify) -> route to Render Backend API
    if (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com') || hostname.endsWith('.netlify.app')) {
      return 'https://quantum-terminal-backend.onrender.com';
    }

    // Localhost / LAN IP desktop development mode
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return `${protocol}//${hostname}:8000`;
    }
  }

  // 3. Fallback for SSR / Node / Electron / Production environments
  return 'https://quantum-terminal-backend.onrender.com';
};

export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
  return apiUrl.replace(/^http[s]?:/, wsProtocol);
};
