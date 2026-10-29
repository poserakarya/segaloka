import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/auth/google-oauth-exchange-route.js', import.meta.url),
  'utf8'
);

test('Google OAuth exchange must not directly send session payload', () => {
  assert.doesNotMatch(
    source,
    /reply\.code\(200\)\.send\(result\)/
  );
});

test('Google OAuth exchange must not directly send access or refresh tokens', () => {
  assert.doesNotMatch(
    source,
    /reply\.code\(200\)\.send\(\s*\{[^}]*?(?:accessToken|refreshToken)/s
  );
});