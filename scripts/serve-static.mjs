// Minimal static file server for checking built apps (compat smoke tests, the static demo build).
// usage: node scripts/serve-static.mjs <directory> [port]
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 5410);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
};

const resolveFile = async (urlPath) => {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = path.resolve(root, `.${decoded}`);

  // never serve files outside the root
  if (!candidate.startsWith(root)) {
    return null;
  }

  const info = await stat(candidate).catch(() => null);
  if (info?.isFile()) {
    return candidate;
  }
  if (info?.isDirectory()) {
    const index = path.join(candidate, 'index.html');
    if (await stat(index).catch(() => null)) {
      return index;
    }
  }

  // single page app fallback
  return path.join(root, 'index.html');
};

createServer(async (req, res) => {
  const file = await resolveFile(req.url ?? '/');
  if (!file) {
    res.writeHead(403).end();
    return;
  }

  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).on('error', () => res.end()).pipe(res);
}).listen(port, () => {
  console.log(`serving ${root} on http://localhost:${port}`);
});
