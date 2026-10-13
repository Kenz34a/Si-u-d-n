import { defineConfig, loadEnv } from 'vite';
import { createBackend } from './server/backend.js';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'ANIME_');
  return { plugins: [{
    name: 'anime-nexus-server',
    configureServer(server) {
      const api = createBackend({ databasePath: env.ANIME_DATABASE_PATH || undefined, origin: env.ANIME_APP_ORIGIN || undefined,
        initialAdmin: { username: env.ANIME_ADMIN_USERNAME || undefined, password: env.ANIME_ADMIN_PASSWORD || undefined },
        secureCookie: env.ANIME_SECURE_COOKIE === 'true' });
      server.middlewares.use((req, res, next) => req.url.startsWith('/api/') ? api.handle(req, res) : next());
      server.httpServer?.once('close', () => api.close());
    },
  }] };
});
