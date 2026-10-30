import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createConfigReader, parseEnvFile, readDbConfig, readIngressSecret } from './service-config.mjs';

test('env file parsing keeps the existing .env format', () => {
  assert.deepEqual(parseEnvFile('A=1\n# komentar\nB="dua"\nC=\'tiga\'\nlower=x\n'), { A: '1', B: 'dua', C: 'tiga' });
});

test('precedence: environment, then NAME_FILE, then legacy .env file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'service-config-'));
  try {
    const legacy = join(dir, '.env');
    writeFileSync(legacy, `INGRESS_IDENTITY_SECRET=${'f'.repeat(40)}\nDB_HOST=127.0.0.1\nDB_PORT=5432\nDB_NAME=dari_file\nDB_USER=u\nDB_PASSWORD=p\nDB_SSL=false\n`);
    writeFileSync(join(dir, 'secret'), `${'s'.repeat(40)}\n`);

    const fromFile = createConfigReader({ env: {} });
    assert.equal(readIngressSecret(fromFile, legacy), 'f'.repeat(40));
    assert.equal(readDbConfig(fromFile, legacy).DB_NAME, 'dari_file');

    const fromSecretFile = createConfigReader({ env: { INGRESS_IDENTITY_SECRET_FILE: join(dir, 'secret') } });
    assert.equal(readIngressSecret(fromSecretFile, legacy), 's'.repeat(40));

    const fromEnv = createConfigReader({ env: { INGRESS_IDENTITY_SECRET: 'e'.repeat(40), DB_NAME: 'dari_env', INGRESS_IDENTITY_SECRET_FILE: join(dir, 'secret') } });
    assert.equal(readIngressSecret(fromEnv, legacy), 'e'.repeat(40));
    assert.equal(readDbConfig(fromEnv, legacy).DB_NAME, 'dari_env');
    assert.equal(readDbConfig(fromEnv, legacy).DB_HOST, '127.0.0.1');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('missing configuration and weak ingress secrets fail at startup', () => {
  const read = createConfigReader({ env: {} });
  assert.throws(() => readIngressSecret(read, '/tidak/ada/.env'), /CONFIG_NOT_FOUND:INGRESS_IDENTITY_SECRET/);
  assert.throws(() => readIngressSecret(createConfigReader({ env: { INGRESS_IDENTITY_SECRET: 'pendek' } })), /INVALID_INGRESS_SECRET/);
});
