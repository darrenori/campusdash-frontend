import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const backendTarget = env.VITE_BACKEND_PROXY_URL || 'http://localhost:8080';

  return {
    plugins: [
      vue(),
      basicSsl(),
    ],

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