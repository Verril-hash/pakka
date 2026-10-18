import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the Pakka server (port 8787) handles the API; Vite serves the app.
const api = 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': api, '/state': api, '/admin': api, '/health': api },
  },
});
