/**
 * config.ts — Centralized Production API URL resolver.
 */
export const getApiUrl = (): string => {
  // Check build-time environment variable VITE_API_BASE_URL
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl) {
    return envUrl;
  }

  // Centralized production API backend URL fallback
  return 'https://trading07-backend.onrender.com';
};

export const getWsUrl = (): string => {
  const apiUrl = getApiUrl();
  // Translate HTTP/HTTPS protocol to WS/WSS protocol dynamically
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  return apiUrl.replace(/^http[s]?/, wsProtocol);
};
