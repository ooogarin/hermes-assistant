import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
  const environment = loadEnv(mode, workspaceRoot, '');
  const apiTarget = environment.API_PROXY_TARGET ?? 'http://127.0.0.1:3000';
  const internalApiKey = environment.INTERNAL_API_KEY;

  return {
    plugins: [tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => {
              if (internalApiKey !== undefined) {
                proxyRequest.setHeader('Authorization', `Bearer ${internalApiKey}`);
              }
            });
          },
        },
      },
    },
  };
});
