import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  envPrefix: ['VITE_', 'GOLD_API_'],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            if (id.includes('lightweight-charts')) {
              return 'charts-vendor';
            }
            if (id.includes('zustand') || id.includes('immer')) {
              return 'state-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false,   // disable Vite's error overlay — we use our own ErrorBoundary
    },
  },
});
