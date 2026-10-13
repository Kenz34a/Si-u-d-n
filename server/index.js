import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createBackend } from './backend.js';
const api = createBackend(), root = resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
const server = createServer((req, res) => {
  if (req.url.startsWith('/api/')) { api.handle(req, res); return; }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let path;
  try { path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400); res.end(); return; }
  if (!(path === root || path.startsWith(root + sep))) { res.writeHead(403); res.end(); return; }
  if (path === root || !extname(path)) path = resolve(root, 'index.html');
  if (!existsSync(path)) { res.writeHead(404); res.end('Not found'); return; }
  try { const body = readFileSync(path); res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream'); res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Cache-Control', path.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'); res.end(req.method === 'HEAD' ? undefined : body); }
  catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`Anime Nexus server ready on port ${server.address().port}.`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => { api.close(); process.exit(0); }));
