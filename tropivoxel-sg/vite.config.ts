import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {createApi} from './server/api.mjs';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), {
      name: 'local-environment-api',
      configureServer(server) { server.middlewares.use('/api', createApi()); },
      configurePreviewServer(server) { server.middlewares.use('/api', createApi()); },
    }],
    server: {
      host: '127.0.0.1',
      port: 3000,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
