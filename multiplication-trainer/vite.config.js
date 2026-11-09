import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serverless-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/generate-creature-video')) {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const rawBody = Buffer.concat(buffers).toString('utf-8');
            try {
              req.body = rawBody ? JSON.parse(rawBody) : {};
            } catch (e) {
              req.body = {};
            }

            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return res;
            };

            try {
              const handler = (await import('./api/generate-creature-video.js')).default;
              return await handler(req, res);
            } catch (err) {
              console.error('[API Middleware Error]:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    open: true,
  },
});
