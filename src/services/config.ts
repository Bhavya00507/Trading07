/**
 * config.ts — Centralized Production API URL resolver.
 */
export const getApiUrl = (): string => {
  // Check build-time environment variable VITE_API_BASE_URL
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl && !envUrl.includes('trading07-backend.onrender.com')) {
    return envUrl;
  }

  // If running in browser, adapt dynamically to current hostname
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If running on localhost or LAN IP (e.g. 192.168.x.x, 10.x.x.x, 127.0.0.1)
    if (
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') || 
      hostname.startsWith('10.') || 
      hostname.startsWith('172.')
    ) {
      return `${protocol}//${hostname}:8000`;
    }
  }

  // Default fallback
  return 'http://127.0.0.1:8000';
};

export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  return apiUrl.replace(/^http[s]?/, wsProtocol);
};
