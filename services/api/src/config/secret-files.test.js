import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadSecretFiles } from './secret-files.js';

test('secret files fill unset variables, never override explicit values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'secret-files-'));
  try {
    writeFileSync(join(dir, 'ingress'), 'x'.repeat(48) + '\n');
    writeFileSync(join(dir, 'db'), 'kata-sandi-db\n');
    const env = {
      INGRESS_IDENTITY_SECRET_FILE: join(dir, 'ingress'),
      DB_PASSWORD: 'eksplisit',
      DB_PASSWORD_FILE: join(dir, 'db'),
      UNLISTED_FILE: join(dir, 'db')
    };
    assert.deepEqual(loadSecretFiles(env), ['INGRESS_IDENTITY_SECRET']);
    assert.equal(env.INGRESS_IDENTITY_SECRET, 'x'.repeat(48));
    assert.equal(env.DB_PASSWORD, 'eksplisit');
    assert.equal(env.UNLISTED, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('missing secret file fails loudly', () => {
  assert.throws(() => loadSecretFiles({ AUTH_IP_HASH_SECRET_FILE: '/tidak/ada' }), /ENOENT/);
});
