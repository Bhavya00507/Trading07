/**
 * config.ts — Zero-dependency URL resolver.
 * Must NOT import from any store or service to avoid circular dependencies.
 *
 * Resolution order:
 *  1. Electron userAgent → always 127.0.0.1:8000
 *  2. Browser location → dynamically use the host serving the page on port 8000
 *  3. Fallback to build-time env var or localhost
 */
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const ua = window.navigator.userAgent.toLowerCase();

    // Electron desktop app
    if (ua.includes('electron')) {
      return 'http://127.0.0.1:8000';
    }

    // Dynamic resolution based on browser location (LAN support)
    const hostname = window.location.hostname;
    if (hostname) {
      if (hostname === '127.0.0.1' || hostname === 'localhost') {
        return 'http://127.0.0.1:8000';
      }
      // If accessed via a LAN IP (e.g. 192.168.1.5:4173), dynamically hit 192.168.1.5:8000
      return `http://${hostname}:8000`;
    }
  }

  // Build-time env var fallback
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (envUrl) {
    return envUrl;
  }

  return 'http://127.0.0.1:8000';
};
