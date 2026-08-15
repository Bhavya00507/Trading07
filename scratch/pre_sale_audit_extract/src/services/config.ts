/**
 * config.ts — Centralized Production & Development API / WebSocket URL resolver.
 * Dynamically adapts to local desktop development, LAN mobile IP access, and production deployments.
 */
export const getApiUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

  // If running in browser, adapt dynamically to current hostname (Desktop localhost or Mobile LAN IP)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    
    // If envUrl is explicitly configured for a remote domain (not loopback 127.0.0.1/localhost), honor it
    if (
      envUrl && 
      !envUrl.includes('127.0.0.1') && 
      !envUrl.includes('localhost') && 
      !envUrl.includes('trading07-backend.onrender.com')
    ) {
      return envUrl;
    }
    
    // Dynamically bind to current client hostname on port 8000
    return `${protocol}//${hostname}:8000`;
  }

  // Fallback for SSR / Node environments
  return 'http://127.0.0.1:8000';
};

export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  return apiUrl.replace(/^http[s]?/, wsProtocol);
};
