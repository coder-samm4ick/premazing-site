import http from 'node:http';
import dgram from 'node:dgram';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const SAMP_HOST = process.env.SAMP_HOST || '80.242.59.112';
const SAMP_PORT = Number(process.env.SAMP_PORT || 4141);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon'
};
let statusCache = { expires: 0, data: null };

function querySamp() {
  return new Promise(resolveQuery => {
    const socket = dgram.createSocket('udp4');
    const ip = Buffer.from(SAMP_HOST.split('.').map(Number));
    const port = Buffer.alloc(2);
    port.writeUInt16LE(SAMP_PORT);
    const packet = Buffer.concat([Buffer.from('SAMP'), ip, port, Buffer.from('i')]);
    let finished = false;

    const finish = data => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.close();
      resolveQuery(data);
    };

    const timer = setTimeout(() => finish({
      online: false,
      players: 0,
      max: 50,
      checkedAt: new Date().toISOString()
    }), 3500);

    socket.on('message', message => {
      if (message.length < 16) return finish(null);
      finish({
        online: true,
        players: message.readUInt16LE(12),
        max: message.readUInt16LE(14),
        checkedAt: new Date().toISOString()
      });
    });
    socket.on('error', () => finish(null));
    socket.send(packet, SAMP_PORT, SAMP_HOST);
  });
}

async function getServerStatus() {
  if (statusCache.data && statusCache.expires > Date.now()) return statusCache.data;
  const result = await querySamp();
  const data = result || { online: false, players: 0, max: 50, checkedAt: new Date().toISOString() };
  statusCache = { data, expires: Date.now() + 15000 };
  return data;
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(data));
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/api/server-status') {
      if (request.method !== 'GET') return sendJson(response, 405, { error: 'method_not_allowed' });
      return sendJson(response, 200, await getServerStatus());
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405);
      return response.end();
    }

    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = resolve(ROOT, relative);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
      response.writeHead(403);
      return response.end('Forbidden');
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('not_file');
    const contentType = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileStat.size,
      'Cache-Control': contentType.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') return response.end();
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Файл не найден');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Premazing: http://127.0.0.1:${PORT}`);
});
