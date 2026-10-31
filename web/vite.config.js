import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';

// Petit proxy local : les serveurs IPTV n'envoient pas d'en-têtes CORS et
// servent en http, ce que le navigateur bloque pour mpegts.js / hls.js.
// GET /stream?url=<http(s)://...> relaie le flux (Range compris).
const FORWARD = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified'];

function streamProxy() {
  const handler = async (req, res, next) => {
    if (!req.url.startsWith('/stream?')) return next();
    const target = new URL(req.url, 'http://local').searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      res.statusCode = 400;
      return res.end('url invalide');
    }
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    try {
      const headers = { 'user-agent': 'VLC/3.0.20 LibVLC/3.0.20' };
      if (req.headers.range) headers.range = req.headers.range;
      const upstream = await fetch(target, { headers, redirect: 'follow', signal: controller.signal });
      res.statusCode = upstream.status;
      for (const h of FORWARD) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }
      res.setHeader('access-control-allow-origin', '*');
      if (!upstream.body) return res.end();
      Readable.fromWeb(upstream.body).on('error', () => res.destroy()).pipe(res);
    } catch (err) {
      if (controller.signal.aborted) return;
      res.statusCode = 502;
      res.end(String(err?.message || err));
    }
  };
  return {
    name: 'iptv-stream-proxy',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}

export default defineConfig({
  plugins: [react(), streamProxy()],
  server: { fs: { allow: ['..'] } }
});
