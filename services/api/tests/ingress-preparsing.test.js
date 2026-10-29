import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

import { signIngressRequest } from '../src/security/ingress-identity-v3.js';
import { createIngressPreParsing } from '../src/security/ingress-preparsing.js';

const secret = 'test-ingress-secret-for-preparsing-123456789';
const body = Buffer.from('{"email":"test@example.com"}');

function makeRequest(headers) {
  return {
    headers,
    raw: {
      method: 'POST',
      url: '/auth/login'
    }
  };
}

function makeReply() {
  return {
    status: null,
    response: null,
    code(status) {
      this.status = status;
      return this;
    },
    send(response) {
      this.response = response;
      return this;
    }
  };
}

test('01 - valid request preserves JSON body', async () => {
  const headers = signIngressRequest(secret, {
    ip: '192.0.2.10',
    method: 'POST',
    target: '/auth/login',
    body
  });

  const pool = {
    query: async () => ({ rowCount: 1 })
  };

  const hook = createIngressPreParsing(pool, secret);
  const request = makeRequest(headers);
  const reply = makeReply();

  const stream = await hook(request, reply, Readable.from([body]));

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  assert.deepEqual(Buffer.concat(chunks), body);
  assert.equal(request.verifiedClientIp, '192.0.2.10');
  assert.equal(reply.status, null);
});

test('02 - invalid signature rejected', async () => {
  const pool = {
    query: async () => ({ rowCount: 1 })
  };

  const hook = createIngressPreParsing(pool, secret);
  const request = makeRequest({});
  const reply = makeReply();

  await hook(request, reply, Readable.from([body]));

  assert.equal(reply.status, 403);
  assert.equal(reply.response.code, 'INGRESS_AUTH_FAILED');
});

test('03 - replay rejected', async () => {
  const headers = signIngressRequest(secret, {
    ip: '192.0.2.10',
    method: 'POST',
    target: '/auth/login',
    body
  });

  const pool = {
    query: async () => ({ rowCount: 0 })
  };

  const hook = createIngressPreParsing(pool, secret);
  const reply = makeReply();

  await hook(makeRequest(headers), reply, Readable.from([body]));

  assert.equal(reply.status, 403);
});

test('04 - database error rejected', async () => {
  const headers = signIngressRequest(secret, {
    ip: '192.0.2.10',
    method: 'POST',
    target: '/auth/login',
    body
  });

  const pool = {
    query: async () => {
      throw new Error('DATABASE_UNAVAILABLE');
    }
  };

  const hook = createIngressPreParsing(pool, secret);
  const reply = makeReply();

  await hook(makeRequest(headers), reply, Readable.from([body]));

  assert.equal(reply.status, 403);
});

test('05 - oversized body rejected', async () => {
  const pool = {
    query: async () => ({ rowCount: 1 })
  };

  const hook = createIngressPreParsing(pool, secret);
  const reply = makeReply();

  const oversized = Buffer.alloc(1024 * 1024 + 1);

  await hook(makeRequest({}), reply, Readable.from([oversized]));

  assert.equal(reply.status, 413);
});