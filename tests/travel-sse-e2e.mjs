// The reserved local E2E BFF port. Keep this overrideable so production and
// staging launchers never inherit test configuration.
const base = process.env.BFF_ORIGIN || 'http://127.0.0.1:4292';
const password = process.env.TEST_USER_PASSWORD;
const organizationId = process.env.TEST_ORGANIZATION_ID;
if (!password || !organizationId) throw new Error('TEST_USER_PASSWORD and TEST_ORGANIZATION_ID are required');
const origin = process.env.TEST_FRONTEND_ORIGIN || 'http://127.0.0.1:4209';

async function login(email) {
  const response = await fetch(`${base}/bff/login`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error(`login ${email}: ${response.status}`);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error(`login ${email}: missing session cookie`);
  return cookie;
}

async function request(cookie, path, options = {}) {
  return fetch(base + path, {
    ...options,
    headers: {
      Origin: origin,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Cookie: cookie,
      ...(options.headers || {})
    }
  });
}

async function nextEvent(reader, buffer = '') {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const completeEvent = buffer.match(/^event:\s*(.+)$/m);
    const completeData = buffer.match(/^data:\s*(.+)$/m);
    if (completeEvent && completeData) {
      const id = buffer.match(/^id:\s*(.+)$/m)?.[1] || null;
      return { event: completeEvent[1], id, data: JSON.parse(completeData[1]), buffer: '' };
    }
    const frames = buffer.split(/\r?\n\r?\n/);
    const hasCompleteEventFields = frames.length === 1 &&
      /^event:\s*.+$/m.test(buffer) &&
      /^data:\s*.+$/m.test(buffer);
    if (frames.length > 1 || hasCompleteEventFields) {
      const block = frames.shift();
      const rest = frames.join('\n\n');
      const event = block.match(/^event:\s*(.+)$/m)?.[1];
      const data = block.match(/^data:\s*(.+)$/m)?.[1];
      const id = block.match(/^id:\s*(.+)$/m)?.[1] || null;
      if (event) return { event, id, data: data ? JSON.parse(data) : null, buffer: rest };
      buffer = rest;
    }
    const read = reader.read();
    const result = await Promise.race([
      read,
      new Promise(resolve => setTimeout(() => resolve({ timeout: true }), deadline - Date.now()))
    ]);
    if (result.timeout) {
      await reader.cancel();
      throw new Error(`SSE event timeout bufferedBytes=${buffer.length} hasEvent=${/^event:\s*.+$/m.test(buffer)} hasData=${/^data:\s*.+$/m.test(buffer)}`);
    }
    if (result.done) throw new Error('SSE closed before expected event');
    const chunk = new TextDecoder().decode(result.value);
    if (process.env.SEGALOKA_SSE_TRACE === 'true') console.error(JSON.stringify({ layer: 'client', phase: 'chunk', bytes: result.value.byteLength, hasFrameBoundary: /\r?\n\r?\n/.test(chunk), hasReady: /event:\s*ready/.test(chunk), hasChange: /event:\s*change/.test(chunk) }));
    buffer += chunk;
  }
  await reader.cancel();
  throw new Error(`SSE event timeout bufferedBytes=${buffer.length}`);
}

const first = await login('travel.local@invalid.test');
const second = await login('travel.local@invalid.test');
const me = await request(second, '/bff/me');
if (me.status !== 200) throw new Error(`me status ${me.status}`);
const meBody = await me.json();
if (!meBody.memberships?.some(
  membership => membership.organizationId === organizationId && membership.role === 'travel'
)) {
  throw new Error('travel role or membership mismatch');
}
const stream = await request(second, `/bff/sync/events?organizationId=${organizationId}`);
if (stream.status !== 200) throw new Error(`SSE status ${stream.status}`);
const reader = stream.body.getReader();
let state = await nextEvent(reader);
if (state.event !== 'ready') throw new Error(`expected ready, got ${state.event}`);
const cursor = state.data.cursor;

const create = await request(first, '/bff/departures', {
  method: 'POST',
  body: JSON.stringify({
    organizationId,
    title: `Realtime E2E ${Date.now()}`,
    destination: 'Realtime Test',
    departureDate: '2030-02-10',
    returnDate: '2030-02-20'
  })
});
if (create.status !== 201) throw new Error(`create status ${create.status}`);
const created = (await create.json()).departure;
state = await nextEvent(reader, state.buffer);
if (
  state.event !== 'change' ||
  !/^\d+$/.test(state.id || '') ||
  BigInt(state.id) <= BigInt(cursor) ||
  state.data.entityId !== created.id ||
  state.data.entityType !== 'travel_departure' ||
  state.data.eventType !== 'travel.departure.created' ||
  state.data.payload?.organizationId !== organizationId
) {
  throw new Error(`unexpected change event for ${created.id}`);
}
const eventCursor = state.id;

const read = await request(first, `/bff/departures?organizationId=${organizationId}`);
if (read.status !== 200) throw new Error(`read status ${read.status}`);
const rows = (await read.json()).departures;
if (!rows.some(row => row.id === created.id)) throw new Error('created departure missing from readback');

const replay = await request(second, `/bff/sync/events?organizationId=${organizationId}&after=${cursor}`);
if (replay.status !== 200) throw new Error(`replay status ${replay.status}`);
const replayReader = replay.body.getReader();
const replayReady = await nextEvent(replayReader);
if (replayReady.event !== 'ready') throw new Error('replay ready missing');
const replayed = await nextEvent(replayReader, replayReady.buffer);
if (replayed.event !== 'change' || replayed.id !== eventCursor) {
  throw new Error(`replay mismatch for ${eventCursor}`);
}
await replayReader.cancel();

const denied = await request(first, '/bff/departures?organizationId=00000000-0000-0000-0000-000000000000');
if (denied.status !== 403) throw new Error(`tenant denial status ${denied.status}`);
const logout = await request(first, '/bff/logout', { method: 'POST' });
if (logout.status !== 200) throw new Error(`logout status ${logout.status}`);
const afterLogout = await request(first, `/bff/departures?organizationId=${organizationId}`);
if (afterLogout.status !== 401) throw new Error(`post-logout status ${afterLogout.status}`);
const secondLogout = await request(second, '/bff/logout', { method: 'POST' });
if (secondLogout.status !== 200) throw new Error(`second logout status ${secondLogout.status}`);
const expiredStream = await request(second, `/bff/sync/events?organizationId=${organizationId}`);
if (expiredStream.status !== 401) throw new Error(`expired SSE status ${expiredStream.status}`);
reader.cancel();
console.log(JSON.stringify({ ready: true, cursor, eventCursor, created: true, liveEventReceived: true, readback: true, replay: true, tenantDenied: true, logout: true, postLogoutDenied: true, expiredSseDenied: true }));
