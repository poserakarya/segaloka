import { randomBytes, createHash } from 'node:crypto';

function randomBase64Url(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Hex(value) {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

export function createGoogleOAuthParameters() {
  const state = randomBase64Url();
  const nonce = randomBase64Url();
  const codeVerifier = randomBase64Url(64);

  const codeChallenge = createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest('base64url');

  return {
    state,
    stateHash: sha256Hex(state),
    nonce,
    nonceHash: sha256Hex(nonce),
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}