import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const backendTarget = env.VITE_BACKEND_PROXY_URL || 'http://localhost:8080';

  return {
    plugins: [
      vue(),
      //locally-trusted https via mkcert so chrome runs the service worker. a
      //self-signed cert fails the ssl check on the sw script fetch and push dies.
      //the actual one uses digital ocean, this only for testing :)
      mode === 'development' ? mkcert({ hosts: ['localhost', '127.0.0.1'] }) : null,
    ].filter(Boolean),

    server: {
      host: '0.0.0.0',
      https: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },

        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },

        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },

    base: env.GITHUB_PAGES_BASE ?? '/',
  };
});
