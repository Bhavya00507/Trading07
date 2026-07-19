/**
 * config.ts — Centralized Production & Development API URL resolver.
 */
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const ua = window.navigator.userAgent.toLowerCase();

    // In development (localhost or local loopback), connect to local FastAPI
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }

  // Check build-time environment variable fallback
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (envUrl) {
    return envUrl;
  }

  // Centralized production API backend URL fallback
  return 'https://api.myserver.com';
};

export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  // Translate HTTP/HTTPS protocol to WS/WSS protocol dynamically
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  return apiUrl.replace(/^http[s]?/, wsProtocol);
};
