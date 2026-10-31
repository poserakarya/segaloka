// Utilitas E2E realtime: request API bertanda tangan ingress, klien SSE di
// atas fetch (Last-Event-ID), dan pengelolaan proses asli.
import { spawn } from 'node:child_process';

import { signIngressRequest } from '../../services/api/src/security/ingress-identity-v3.js';
import { marketplaceHandoffLogin } from './marketplace-handoff.mjs';

export function createRealtimeHarness({ apiOrigin, ingressSecret }) {
  const streams = [];
  const children = [];

  async function api(method, path, { body, token } = {}) {
    const raw = body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
    const signed = signIngressRequest(ingressSecret, { ip: '127.0.0.1', method, target: path, body: raw });
    const response = await fetch(apiOrigin + path, {
      method,
      headers: {
        ...signed,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body === undefined ? {} : { body: raw })
    });
    return { status: response.status, data: await response.json().catch(() => ({})) };
  }

  function openStream(url, headers = {}) {
    const abort = new AbortController();
    const stream = { url, events: [], status: null, ready: null, ended: false, waiters: [] };
    const notify = () => { stream.waiters = stream.waiters.filter(waiter => !waiter()); };

    stream.done = (async () => {
      try {
        const response = await fetch(url, { headers, signal: abort.signal });
        stream.status = response.status;
        if (!response.ok) return;
        const decoder = new TextDecoder();
        let buffer = '';
        for await (const chunk of response.body) {
          buffer += decoder.decode(chunk, { stream: true });
          let index;
          while ((index = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, index);
            buffer = buffer.slice(index + 2);
            const event = { event: 'message', id: null, data: null, at: Date.now() };
            for (const line of frame.split('\n')) {
              if (line.startsWith('event: ')) event.event = line.slice(7);
              else if (line.startsWith('id: ')) event.id = line.slice(4);
              else if (line.startsWith('data: ')) event.data = JSON.parse(line.slice(6));
            }
            if (event.data === null && event.event === 'message') continue;
            if (event.event === 'ready') stream.ready = event;
            stream.events.push(event);
            notify();
          }
        }
      } catch {
        // Dibatalkan oleh close().
      } finally {
        stream.ended = true;
        notify();
      }
    })();

    stream.waitFor = (predicate, timeout = 8000) => new Promise((resolve, reject) => {
      const check = () => {
        const found = stream.events.find(predicate);
        if (found) { clearTimeout(timer); resolve(found); return true; }
        return false;
      };
      const timer = setTimeout(() => {
        stream.waiters = stream.waiters.filter(w => w !== check);
        reject(new Error(`event not received within ${timeout}ms (${url})`));
      }, timeout);
      if (!check()) stream.waiters.push(check);
    });
    stream.waitReady = (timeout = 8000) => new Promise((resolve, reject) => {
      const check = () => {
        if (stream.ready || stream.ended) { clearTimeout(timer); resolve(stream.ready); return true; }
        return false;
      };
      const timer = setTimeout(() => reject(new Error(`stream not ready (${url}) status=${stream.status}`)), timeout);
      if (!check()) stream.waiters.push(check);
    });
    stream.changes = () => stream.events.filter(event => event.event === 'change');
    stream.close = () => abort.abort();
    streams.push(stream);
    return stream;
  }

  function apiStream(path, token, lastEventId) {
    const signed = signIngressRequest(ingressSecret, { ip: '127.0.0.1', method: 'GET', target: path, body: Buffer.alloc(0) });
    return openStream(apiOrigin + path, {
      ...signed,
      Authorization: `Bearer ${token}`,
      ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {})
    });
  }

  function start(label, args, options) {
    const child = spawn(process.execPath, args, { ...options, stdio: ['ignore', 'ignore', 'pipe'] });
    child.label = label;
    child.stderrText = '';
    child.stderr.on('data', chunk => { child.stderrText += chunk; });
    children.push(child);
    return child;
  }

  async function waitHttp(url, child, label) {
    for (let i = 0; i < 300; i++) {
      if (child && child.exitCode !== null) throw new Error(`${label} exited: ${child.stderrText.slice(-800)}`);
      try {
        const response = await fetch(url, { redirect: 'manual' });
        if (response.status < 500) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`${label} not ready`);
  }

  // Login dashboard lewat Marketplace (handoff), bukan form dashboard.
  function bffLogin(origin, email, password, dashboard, options = {}) {
    return marketplaceHandoffLogin({ apiOrigin, ingressSecret, dashboardOrigin: origin, dashboard, email, password, ...options });
  }

  function shutdown() {
    for (const stream of streams) stream.close();
    for (const child of children) child.kill();
  }

  return { api, openStream, apiStream, start, waitHttp, bffLogin, shutdown };
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
