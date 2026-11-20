import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables from .env (including non-VITE_ server keys) into process.env for /api handlers
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-serverless-dev-handler',
        configureServer(server) {
          // Dev handler for /api/register
          server.middlewares.use('/api/register', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
              return;
            }
            let rawBody = '';
            req.on('data', (chunk) => {
              rawBody += chunk;
            });
            req.on('end', async () => {
              try {
                (req as any).body = rawBody ? JSON.parse(rawBody) : {};
                const { default: handler } = await server.ssrLoadModule('./api/register.ts');
                (res as any).status = function (code: number) {
                  res.statusCode = code;
                  return res;
                };
                (res as any).json = function (payload: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(payload));
                  return res;
                };
                await handler(req, res);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err?.message || 'Serverless dev handler error' }));
              }
            });
          });

          // Dev handler for /api/send-email
          server.middlewares.use('/api/send-email', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
              return;
            }
            let rawBody = '';
            req.on('data', (chunk) => {
              rawBody += chunk;
            });
            req.on('end', async () => {
              try {
                (req as any).body = rawBody ? JSON.parse(rawBody) : {};
                const { default: handler } = await server.ssrLoadModule('./api/send-email.ts');
                (res as any).status = function (code: number) {
                  res.statusCode = code;
                  return res;
                };
                (res as any).json = function (payload: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(payload));
                  return res;
                };
                await handler(req, res);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err?.message || 'Serverless dev handler error' }));
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-exceljs': ['exceljs'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
  };
})
