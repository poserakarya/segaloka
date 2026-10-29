import { Readable } from 'node:stream';
import { authenticateIngressRequest } from './ingress-request-auth.js';

const MAX_BODY_BYTES = 1024 * 1024;

export function createIngressPreParsing(pool, secret) {
  if (
    !pool ||
    typeof pool.query !== 'function' ||
    typeof secret !== 'string' ||
    secret.length < 32
  ) {
    throw new Error('INVALID_INGRESS_CONFIGURATION');
  }

  return async function ingressPreParsing(request, reply, payload) {
    const chunks = [];
    let total = 0;

    try {
      for await (const chunk of payload) {
        total += chunk.length;

        if (total > MAX_BODY_BYTES) {
          reply.code(413).send({
            code: 'REQUEST_TOO_LARGE'
          });

          return;
        }

        chunks.push(chunk);
      }

      const body = Buffer.concat(chunks);

      const result = await authenticateIngressRequest(
        pool,
        request.headers,
        secret,
        {
          method: request.raw.method,
          target: request.raw.url,
          body
        }
      );

      if (!result.allowed) {
        reply.code(403).send({
          code: 'INGRESS_AUTH_FAILED'
        });

        return;
      }

      request.verifiedClientIp = result.ip;

      const stream = Readable.from([body]);
      stream.receivedEncodedLength = body.length;

      return stream;
    } catch {
      reply.code(503).send({
        code: 'INGRESS_VERIFICATION_UNAVAILABLE'
      });
    }
  };
}