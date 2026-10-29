import { randomBytes } from 'node:crypto';
import { createSessionAuth } from '../security/session-auth.js';
import { isTestDataOrganization, productionOrganizationFilter } from '../security/test-data-policy.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function hasAffiliatePermission(client, userId, permission) {
  const result = await client.query(
    `SELECT 1
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     JOIN public.role_permissions rp ON rp.role_id = r.id
     JOIN public.permissions p ON p.id = rp.permission_id
     WHERE m.user_id = $1
       AND m.organization_id IS NULL
       AND r.code = 'affiliate'
       AND p.code = $2
     LIMIT 1`,
    [userId, permission]
  );

  return result.rows.length > 0;
}

async function rollback(client, request) {
  try {
    await client.query('ROLLBACK');
  } catch (error) {
    request.log.error({ err: error }, 'Affiliate rollback failed');
  }
}

export async function registerAffiliateReferralLinkRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/affiliate/referral-links', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const allowed = await hasAffiliatePermission(
      pool,
      request.auth.userId,
      'affiliate.referral_links.read'
    );

    if (!allowed) {
      return reply.code(403).send({
        code: 'AFFILIATE_ACCESS_DENIED'
      });
    }

    const productionFilter = await productionOrganizationFilter(pool, 'o');
    const result = await pool.query(
      `SELECT
         l.id,
         l.travel_organization_id AS "travelOrganizationId",
         o.name AS "travelName",
         l.referral_code AS "referralCode",
         l.status,
         l.created_at AS "createdAt",
         l.updated_at AS "updatedAt"
       FROM public.affiliate_referral_links l
       JOIN public.organizations o
         ON o.id = l.travel_organization_id
       WHERE l.affiliate_user_id = $1${productionFilter}
         AND o.id = l.travel_organization_id
       ORDER BY l.created_at DESC, l.id`,
      [request.auth.userId]
    );

    return reply.code(200).send({
      items: result.rows
    });
  });

  app.post('/affiliate/referral-links', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const body = request.body;
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.travelOrganizationId !== 'string' ||
      !UUID.test(body.travelOrganizationId)
    ) {
      return reply.code(400).send({
        code: 'INVALID_REFERRAL_LINK_INPUT'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const allowed = await hasAffiliatePermission(
        client,
        request.auth.userId,
        'affiliate.referral_links.manage'
      );

      if (!allowed) {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'AFFILIATE_ACCESS_DENIED'
        });
      }

      const travel = await client.query(
        `SELECT id
         FROM public.organizations
         WHERE id = $1
           AND organization_type = 'travel'
           AND status = 'active'
         FOR KEY SHARE`,
        [body.travelOrganizationId]
      );

      if (travel.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(404).send({
          code: 'TRAVEL_ORGANIZATION_UNAVAILABLE'
        });
      }

      if (await isTestDataOrganization(client, body.travelOrganizationId)) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'TEST_DATA_REFERRAL_NOT_ALLOWED'
        });
      }

      const inserted = await client.query(
        `INSERT INTO public.affiliate_referral_links (
           affiliate_user_id,
           travel_organization_id,
           referral_code
         )
         VALUES ($1, $2, $3)
         RETURNING
           id,
           travel_organization_id AS "travelOrganizationId",
           referral_code AS "referralCode",
           status,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [
          request.auth.userId,
          body.travelOrganizationId,
          randomBytes(12).toString('hex')
        ]
      );

      const link = inserted.rows[0];

      await client.query(
        `INSERT INTO public.audit_logs (
           actor_user_id,
           organization_id,
           action,
           entity_type,
           entity_id
         )
         VALUES (
           $1, $2, 'affiliate.referral_link.created',
           'affiliate_referral_link', $3
         )`,
        [
          request.auth.userId,
          body.travelOrganizationId,
          link.id
        ]
      );

      await client.query(
        `INSERT INTO public.sync_outbox (
           organization_id, event_type, entity_type, entity_id, payload
         ) VALUES ($1, 'affiliate.referral_link.created',
           'affiliate_referral_link', $2, jsonb_build_object(
             'affiliateUserId', $3::uuid::text,
             'travelOrganizationId', $1::uuid::text
           ))`,
        [link.travelOrganizationId, link.id, request.auth.userId]
      );

      await client.query('COMMIT');

      return reply.code(201).send({ link });
    } catch (error) {
      await rollback(client, request);

      if (error.code === '23505') {
        return reply.code(409).send({
          code: 'REFERRAL_LINK_ALREADY_EXISTS'
        });
      }

      request.log.error(
        { err: error },
        'Affiliate referral link creation failed'
      );

      return reply.code(500).send({
        code: 'REFERRAL_LINK_CREATION_FAILED'
      });
    } finally {
      client.release();
    }
  });

  app.patch('/affiliate/referral-links/:id', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (!UUID.test(request.params.id)) {
      return reply.code(400).send({
        code: 'INVALID_REFERRAL_LINK_ID'
      });
    }

    const status = request.body?.status;
    if (status !== 'active' && status !== 'paused') {
      return reply.code(400).send({
        code: 'INVALID_REFERRAL_LINK_STATUS'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const allowed = await hasAffiliatePermission(
        client,
        request.auth.userId,
        'affiliate.referral_links.manage'
      );

      if (!allowed) {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'AFFILIATE_ACCESS_DENIED'
        });
      }

      const updated = await client.query(
        `UPDATE public.affiliate_referral_links
         SET status = $3, updated_at = now()
         WHERE id = $1
           AND affiliate_user_id = $2
         RETURNING
           id,
           travel_organization_id AS "travelOrganizationId",
           referral_code AS "referralCode",
           status,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [request.params.id, request.auth.userId, status]
      );

      if (updated.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(404).send({
          code: 'REFERRAL_LINK_NOT_FOUND'
        });
      }

      const link = updated.rows[0];

      if (await isTestDataOrganization(client, link.travelOrganizationId)) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'TEST_DATA_REFERRAL_NOT_ALLOWED'
        });
      }

      await client.query(
        `INSERT INTO public.audit_logs (
           actor_user_id,
           organization_id,
           action,
           entity_type,
           entity_id
         )
         VALUES ($1, $2, $3, 'affiliate_referral_link', $4)`,
        [
          request.auth.userId,
          link.travelOrganizationId,
          `affiliate.referral_link.${status}`,
          link.id
        ]
      );

      await client.query(
        `INSERT INTO public.sync_outbox (
           organization_id, event_type, entity_type, entity_id, payload
         ) VALUES ($1, $2, 'affiliate_referral_link', $3, jsonb_build_object(
           'affiliateUserId', $4::uuid::text,
           'travelOrganizationId', $1::uuid::text,
           'status', $5
         ))`,
        [
          link.travelOrganizationId,
          `affiliate.referral_link.${status}`,
          link.id,
          request.auth.userId,
          status
        ]
      );

      await client.query('COMMIT');

      return reply.code(200).send({ link });
    } catch (error) {
      await rollback(client, request);
      request.log.error(
        { err: error },
        'Affiliate referral link update failed'
      );

      return reply.code(500).send({
        code: 'REFERRAL_LINK_UPDATE_FAILED'
      });
    } finally {
      client.release();
    }
  });
}
