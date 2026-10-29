import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceUrl = new URL(
  '../src/auth/dashboard-handoff-service.js',
  import.meta.url
);

const source = readFileSync(serviceUrl, 'utf8');

test('handoff ticket must not expose binding alongside ticket', () => {
  assert.doesNotMatch(
    source,
    /return\s*\{\s*ticket\s*,\s*binding\s*,/m,
    'SECURITY: Ticket and binding must not be returned together'
  );
});

test('handoff consumption must validate ticket and binding', () => {
  assert.match(
    source,
    /!validSecret\(ticket\)\s*\|\|\s*!validSecret\(binding\)/,
    'SECURITY: Ticket and binding validation must remain present'
  );
});

test('handoff must enforce one-time database consumption', () => {
  assert.match(
    source,
    /DELETE\s+FROM\s+public\.auth_dashboard_handoffs/i,
    'SECURITY: Atomic ticket consumption must remain present'
  );

  assert.match(
    source,
    /RETURNING\s+h\.session_payload_encrypted/i,
    'SECURITY: Consumed ticket payload must be returned atomically'
  );
});

test('handoff must reject expired tickets', () => {
  assert.match(
    source,
    /h\.expires_at\s*>\s*now\(\)/,
    'SECURITY: Expiration check must remain present'
  );
});
