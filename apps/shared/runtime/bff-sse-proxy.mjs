// Proxy SSE dari BFF ke stream /sync/* API. BFF tidak memfilter atau
// menambah izin: filter tenant/role/kepemilikan dilakukan API. Kursor
// diteruskan lewat Last-Event-ID atau ?after= agar reconnect tidak melewatkan
// event.

const CURSOR = /^\d{1,19}$/;

export async function proxySyncStream(req, res, {
  apiOrigin,
  target,
  ingressSecret,
  accessToken,
  signIngressRequest,
  json,
  label = 'BFF'
}) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const after = requestUrl.searchParams.get('after');
  const lastEventId = req.headers['last-event-id'];
  const query = new URLSearchParams(
    [...new URL(target, 'http://127.0.0.1').searchParams]
  );

  if (after !== null) {
    if (!CURSOR.test(after)) return json(res, 400, { code: 'INVALID_SYNC_CURSOR' });
    query.set('after', after);
  }

  if (lastEventId !== undefined && !CURSOR.test(String(lastEventId))) {
    return json(res, 400, { code: 'INVALID_SYNC_CURSOR' });
  }

  const path = new URL(target, 'http://127.0.0.1').pathname;
  const fullTarget = query.toString() ? `${path}?${query}` : path;
  const signed = signIngressRequest(ingressSecret, {
    ip: '127.0.0.1',
    method: 'GET',
    target: fullTarget,
    body: Buffer.alloc(0)
  });
  const abort = new AbortController();

  res.once('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  let upstream;

  try {
    upstream = await fetch(apiOrigin + fullTarget, {
      method: 'GET',
      headers: {
        ...signed,
        Authorization: `Bearer ${accessToken}`,
        ...(lastEventId ? { 'Last-Event-ID': String(lastEventId) } : {})
      },
      signal: abort.signal
    });
  } catch (error) {
    if (abort.signal.aborted) return;
    console.error(`[${label}] Sync API unavailable:`, error.name || 'Error');
    return json(res, 503, { code: 'SYNC_UNAVAILABLE' });
  }

  if (!upstream.ok || !upstream.body) {
    const result = await upstream.json().catch(() => ({ code: 'SYNC_UNAVAILABLE' }));
    return json(res, upstream.status === 200 ? 502 : upstream.status, result);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff'
  });
  res.socket?.setNoDelay?.(true);
  res.flushHeaders?.();

  const reader = upstream.body.getReader();

  try {
    while (!res.destroyed) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (!res.write(Buffer.from(chunk.value))) {
        await new Promise(resolve => res.once('drain', resolve));
      }
    }
    if (!res.writableEnded && !res.destroyed) res.end();
  } catch (error) {
    if (!abort.signal.aborted) {
      console.error(`[${label}] Sync stream failed:`, error.name || 'Error');
    }
    if (!res.destroyed) res.destroy();
  } finally {
    reader.releaseLock();
  }
}
