import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerAffiliateReferralLinkRoutes } from './referral-links-route.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TRAVEL_ID = '22222222-2222-4222-8222-222222222222';
const LINK_ID = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'a'.repeat(64);

function createPool({
  authenticated = true,
  affiliate = true,
  travel = true,
  existingLink = true,
  duplicate = false
} = {}) {
  const statements = [];
  const link = {
    id: LINK_ID,
    travelOrganizationId: TRAVEL_ID,
    referralCode: 'a'.repeat(24),
    status: 'active'
  };

  async function query(sql, values = []) {
    statements.push({ sql, values });

    if (sql.includes('information_schema.columns')) {
      return { rows: [{ available: false }] };
    }

    if (sql.includes('FROM public.auth_access_tokens')) {
      return {
        rows: authenticated
          ? [{ user_id: USER_ID, session_id: 'session-1' }]
          : []
      };
    }

    if (sql.includes('FROM public.memberships m')) {
      return {
        rows: affiliate ? [{ '?column?': 1 }] : []
      };
    }

    if (sql.includes('FROM public.organizations')) {
      return {
        rows: travel ? [{ id: TRAVEL_ID }] : []
      };
    }

    if (sql.includes('INSERT INTO public.affiliate_referral_links')) {
      if (duplicate) {
        throw Object.assign(new Error('duplicate link'), {
          code: '23505'
        });
      }

      return {
        rows: [{
          ...link,
          travelOrganizationId: values[1],
          referralCode: values[2]
        }]
      };
    }

    if (sql.includes('FROM public.affiliate_referral_links l')) {
      return {
        rows: existingLink
          ? [{ ...link, travelName: 'Travel Test' }]
          : []
      };
    }

    if (sql.includes('UPDATE public.affiliate_referral_links')) {
      return {
        rows: existingLink
          ? [{ ...link, status: values[2] }]
          : []
      };
    }

    return { rows: [] };
  }

  return {
    statements,
    query,
    async connect() {
      return {
        query,
        release() {}
      };
    }
  };
}

async function createApp(options) {
  const pool = createPool(options);
  const app = Fastify({ logger: false });
  await registerAffiliateReferralLinkRoutes(app, pool);
  await app.ready();
  return { app, pool };
}

const authHeaders = {
  authorization: `Bearer ${TOKEN}`
};

test('tautan referral memerlukan sesi', async () => {
  const { app } = await createApp({ authenticated: false });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/affiliate/referral-links'
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('role selain Affiliate ditolak', async () => {
  const { app } = await createApp({ affiliate: false });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/affiliate/referral-links',
      headers: authHeaders
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'AFFILIATE_ACCESS_DENIED');
  } finally {
    await app.close();
  }
});

test('Affiliate hanya membaca daftar tautan miliknya', async () => {
  const { app } = await createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/affiliate/referral-links',
      headers: authHeaders
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].id, LINK_ID);
    assert.ok(response.json().items[0].travelName);
  } finally {
    await app.close();
  }
});

test('tautan hanya dapat dibuat untuk organisasi Travel aktif', async () => {
  const { app, pool } = await createApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/affiliate/referral-links',
      headers: authHeaders,
      payload: { travelOrganizationId: TRAVEL_ID }
    });

    assert.equal(response.statusCode, 201);
    assert.match(response.json().link.referralCode, /^[0-9a-f]{24}$/);
    assert.ok(pool.statements.some(({ sql }) =>
      sql.includes('INSERT INTO public.audit_logs')
    ));
    assert.equal(pool.statements.at(-1).sql, 'COMMIT');
  } finally {
    await app.close();
  }
});

test('organisasi bukan Travel aktif tidak dapat ditautkan', async () => {
  const { app, pool } = await createApp({ travel: false });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/affiliate/referral-links',
      headers: authHeaders,
      payload: { travelOrganizationId: TRAVEL_ID }
    });

    assert.equal(response.statusCode, 404);
    assert.ok(pool.statements.some(({ sql }) => sql === 'ROLLBACK'));
    assert.ok(!pool.statements.some(({ sql }) => sql === 'COMMIT'));
  } finally {
    await app.close();
  }
});

test('tautan ganda Affiliate-Travel ditolak', async () => {
  const { app } = await createApp({ duplicate: true });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/affiliate/referral-links',
      headers: authHeaders,
      payload: { travelOrganizationId: TRAVEL_ID }
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, 'REFERRAL_LINK_ALREADY_EXISTS');
  } finally {
    await app.close();
  }
});

test('Affiliate dapat menjeda tautan miliknya', async () => {
  const { app, pool } = await createApp();

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: `/affiliate/referral-links/${LINK_ID}`,
      headers: authHeaders,
      payload: { status: 'paused' }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().link.status, 'paused');
    assert.ok(pool.statements.some(({ sql, values }) =>
      sql.includes('INSERT INTO public.audit_logs') &&
      values.includes('affiliate.referral_link.paused')
    ));
  } finally {
    await app.close();
  }
});

test('tautan milik Affiliate lain tidak dapat diubah', async () => {
  const { app } = await createApp({ existingLink: false });

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: `/affiliate/referral-links/${LINK_ID}`,
      headers: authHeaders,
      payload: { status: 'paused' }
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'REFERRAL_LINK_NOT_FOUND');
  } finally {
    await app.close();
  }
});
