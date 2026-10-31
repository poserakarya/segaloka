// Harness uji: menjalankan default export Vercel Function (req, res) di
// http.createServer seperti runtime Node Vercel. Meniru edge Vercel untuk
// header IP: x-vercel-forwarded-for / x-real-ip / x-forwarded-for dari klien
// SELALU ditimpa dengan IP klien (header uji x-edge-test-client-ip bila ada,
// selain itu IP socket). Hanya untuk tes; bukan bagian runtime production.
//   node tests/support/vercel-node-harness.mjs <modul function> <port>
import http from 'node:http';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [modulePath, port] = process.argv.slice(2);
const { default: handler } = await import(pathToFileURL(resolve(modulePath)).href);

http.createServer((req, res) => {
  const supplied = req.headers['x-edge-test-client-ip'];
  const clientIp = typeof supplied === 'string' && isIP(supplied) ? supplied : req.socket.remoteAddress;
  delete req.headers['x-edge-test-client-ip'];
  for (const name of ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for']) req.headers[name] = clientIp;
  Promise.resolve(handler(req, res)).catch(error => {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(Number(port), '127.0.0.1', () => console.log(`vercel harness ${port}`));
