import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none'
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/suno': {
          target: 'https://studio-api.suno.ai/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/suno/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              const sunoCookie = req.headers['x-suno-cookie'];
              if (sunoCookie) {
                proxyReq.setHeader('Cookie', `__client_udev=${sunoCookie}; __session=${sunoCookie}`);
                proxyReq.setHeader('Authorization', `Bearer ${sunoCookie}`);
                proxyReq.removeHeader('x-suno-cookie');
              }
              proxyReq.setHeader('origin', 'https://suno.com');
              proxyReq.setHeader('referer', 'https://suno.com/');
            });
          }
        },
        '/suno-cdn1': {
          target: 'https://cdn1.suno.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/suno-cdn1/, ''),
        },
        '/suno-cdn2': {
          target: 'https://cdn2.suno.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/suno-cdn2/, ''),
        },
        '/suno-cdn3': {
          target: 'https://cdn3.suno.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/suno-cdn3/, ''),
        },
        '/suno-cdn': {
          target: 'https://cdn1.suno.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/suno-cdn/, ''),
        },
        '/suno-pipe': {
          target: 'https://audiopipe.suno.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/suno-pipe/, ''),
        }
      }
    },
  };
});
