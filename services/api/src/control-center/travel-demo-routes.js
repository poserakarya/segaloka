import { createSessionAuth } from '../security/session-auth.js';
import { parseTravelBranchPage, validateTravelBranchParent } from './travel-branch-contract.js';
import { hasTestDataOrganizationColumn } from '../security/test-data-policy.js';
import { BRANCH_ENTITY, recordSyncEvent } from '../sync/outbox.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEMO_BATCH = 'SEGALOKA_TRAVEL_DEMO_20261020';

async function isSuperAdmin(pool, userId) {
  const result = await pool.query(
    `SELECT 1 FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1 AND m.organization_id IS NULL
       AND r.code = 'super_admin' LIMIT 1`,
    [userId]
  );
  return result.rowCount > 0;
}

async function schemaReady(pool) {
  if (!(await hasTestDataOrganizationColumn(pool))) return false;
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('test_data_batches', 'test_data_records', 'travel_branches')`
  );
  return result.rows[0]?.count === 3;
}

function unavailable(reply) {
  return reply.code(503).send({ code: 'SCHEMA_NOT_READY' });
}

async function requireAdmin(pool, request, reply) {
  if (!await isSuperAdmin(pool, request.auth.userId)) {
    reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
    return false;
  }
  if (!await schemaReady(pool)) {
    unavailable(reply);
    return false;
  }
  return true;
}

function branchPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (typeof body.branchCode !== 'string' || !body.branchCode.trim() || body.branchCode.length > 80) return null;
  if (typeof body.branchName !== 'string' || !body.branchName.trim() || body.branchName.length > 200) return null;
  return {
    branchCode: body.branchCode.trim(),
    branchName: body.branchName.trim(),
    address: body.address ?? null,
    countryCode: body.countryCode ?? null,
    province: body.province ?? null,
    city: body.city ?? null,
    postalCode: body.postalCode ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    personInCharge: body.personInCharge ?? null,
    status: body.status ?? 'active'
  };
}

async function audit(client, actor, organizationId, action, entityType, entityId) {
  await client.query(
    `INSERT INTO public.audit_logs
       (actor_user_id, organization_id, action, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [actor, organizationId, action, entityType, entityId]
  );
}

export async function registerTravelDemoRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/control-center/travel-branches', { preHandler: requireSession }, async (request, reply) => {
    if (!await requireAdmin(pool, request, reply)) return;
    const { limit, offset, search } = parseTravelBranchPage(request.query);
    const result = await pool.query(
      `SELECT b.id, b.organization_id, o.name AS organization_name,
              b.branch_code, b.branch_name, b.city, b.province,
              b.person_in_charge, b.status, b.created_at, b.updated_at,
              COUNT(*) OVER ()::int AS total_count
       FROM public.travel_branches b
       JOIN public.organizations o ON o.id = b.organization_id
       WHERE o.organization_type = 'travel'
         AND ($1 = '' OR b.branch_name ILIKE $2 OR b.branch_code ILIKE $2 OR o.name ILIKE $2)
       ORDER BY o.name, b.branch_name, b.id
       LIMIT $3 OFFSET $4`,
      [search, `%${search}%`, limit, offset]
    );
    return { source: 'postgresql', items: result.rows, pagination: { limit, offset, total: result.rows[0]?.total_count ?? 0 } };
  });

  app.get('/control-center/travels/:organizationId/branches', { preHandler: requireSession }, async (request, reply) => {
    if (!UUID.test(request.params.organizationId)) return reply.code(400).send({ code: 'INVALID_ORGANIZATION_ID' });
    if (!await requireAdmin(pool, request, reply)) return;
    const parent = await pool.query(
      `SELECT id, name, organization_type, status FROM public.organizations WHERE id = $1`,
      [request.params.organizationId]
    );
    try { validateTravelBranchParent(parent.rows[0]); } catch { return reply.code(404).send({ code: 'TRAVEL_NOT_FOUND' }); }
    const { limit, offset, search } = parseTravelBranchPage(request.query);
    const result = await pool.query(
      `SELECT b.*, COUNT(*) OVER ()::int AS total_count
       FROM public.travel_branches b
       WHERE b.organization_id = $1
         AND ($2 = '' OR b.branch_name ILIKE $3 OR b.branch_code ILIKE $3)
       ORDER BY b.branch_name, b.id LIMIT $4 OFFSET $5`,
      [request.params.organizationId, search, `%${search}%`, limit, offset]
    );
    return { source: 'postgresql', parent: parent.rows[0], items: result.rows, pagination: { limit, offset, total: result.rows[0]?.total_count ?? 0 } };
  });

  app.post('/control-center/travels/:organizationId/branches', { preHandler: requireSession }, async (request, reply) => {
    if (!UUID.test(request.params.organizationId)) return reply.code(400).send({ code: 'INVALID_ORGANIZATION_ID' });
    if (!await requireAdmin(pool, request, reply)) return;
    const payload = branchPayload(request.body);
    if (!payload || !['active', 'inactive'].includes(payload.status)) return reply.code(400).send({ code: 'INVALID_BRANCH_INPUT' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [request.params.organizationId]);
      const parent = await client.query(`SELECT id, organization_type, status FROM public.organizations WHERE id = $1 FOR KEY SHARE`, [request.params.organizationId]);
      try { validateTravelBranchParent(parent.rows[0]); } catch { await client.query('ROLLBACK'); return reply.code(404).send({ code: 'TRAVEL_NOT_FOUND' }); }
      // The default entitlement is a branch-record quota; inactive branches
      // remain part of the quota unless a future entitlement contract says otherwise.
      const count = await client.query(`SELECT COUNT(*)::int AS count FROM public.travel_branches WHERE organization_id = $1`, [request.params.organizationId]);
      if (count.rows[0].count >= 2) { await client.query('ROLLBACK'); return reply.code(409).send({ code: 'BRANCH_QUOTA_EXCEEDED' }); }
      const inserted = await client.query(
        `INSERT INTO public.travel_branches
          (organization_id, branch_code, branch_name, address, country_code, province, city, postal_code, phone, email, person_in_charge, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (organization_id, branch_code) DO NOTHING
         RETURNING *`,
        [request.params.organizationId, payload.branchCode, payload.branchName, payload.address, payload.countryCode, payload.province, payload.city, payload.postalCode, payload.phone, payload.email, payload.personInCharge, payload.status]
      );
      if (inserted.rows.length === 0) {
        const existing = await client.query(`SELECT * FROM public.travel_branches WHERE organization_id = $1 AND branch_code = $2`, [request.params.organizationId, payload.branchCode]);
        await client.query('ROLLBACK');
        return reply.code(200).send({ branch: existing.rows[0], idempotent: true });
      }
      await audit(client, request.auth.userId, request.params.organizationId, 'control_center.travel_branch.created', 'travel_branch', inserted.rows[0].id);
      await recordSyncEvent(client, { organizationId: request.params.organizationId, eventType: 'travel.branch.created', entityType: BRANCH_ENTITY, entityId: inserted.rows[0].id });
      await client.query('COMMIT');
      return reply.code(201).send({ branch: inserted.rows[0], idempotent: false });
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error({ err: error }, 'Travel branch create failed');
      return reply.code(500).send({ code: 'TRAVEL_BRANCH_CREATE_FAILED' });
    } finally { client.release(); }
  });

  app.patch('/control-center/travel-branches/:id', { preHandler: requireSession }, async (request, reply) => {
    if (!UUID.test(request.params.id)) return reply.code(400).send({ code: 'INVALID_BRANCH_ID' });
    if (!await requireAdmin(pool, request, reply)) return;
    if (request.body?.status !== 'active' && request.body?.status !== 'inactive') return reply.code(400).send({ code: 'INVALID_BRANCH_STATUS' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE public.travel_branches b SET status = $2, updated_at = now()
         FROM public.organizations o
         WHERE b.id = $1 AND o.id = b.organization_id AND o.organization_type = 'travel'
         RETURNING b.*`,
        [request.params.id, request.body.status]
      );
      if (!result.rows.length) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ code: 'BRANCH_NOT_FOUND' });
      }
      await audit(client, request.auth.userId, result.rows[0].organization_id, 'control_center.travel_branch.status_changed', 'travel_branch', result.rows[0].id);
      await recordSyncEvent(client, { organizationId: result.rows[0].organization_id, eventType: 'travel.branch.status_changed', entityType: BRANCH_ENTITY, entityId: result.rows[0].id });
      await client.query('COMMIT');
      return { branch: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error({ err: error }, 'Travel branch status update failed');
      return reply.code(500).send({ code: 'TRAVEL_BRANCH_UPDATE_FAILED' });
    } finally { client.release(); }
  });

  app.post('/control-center/test-data/travel-demo', { preHandler: requireSession }, async (request, reply) => {
    if (!await requireAdmin(pool, request, reply)) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const batch = await client.query(`INSERT INTO public.test_data_batches (batch_code, description) VALUES ($1, $2) ON CONFLICT (batch_code) DO UPDATE SET batch_code = EXCLUDED.batch_code RETURNING id`, [DEMO_BATCH, 'Segaloka Travel Demo and branches']);
      const existing = await client.query(`SELECT id FROM public.test_data_records WHERE batch_id = $1 AND entity_table = 'organizations' LIMIT 1`, [batch.rows[0].id]);
      if (existing.rows.length) { await client.query('ROLLBACK'); return reply.code(200).send({ code: DEMO_BATCH, idempotent: true }); }
      const org = await client.query(`INSERT INTO public.organizations (name, organization_type, status, is_test_data) VALUES ('Segaloka Travel Demo','travel','active',TRUE) RETURNING id`);
      await client.query(`INSERT INTO public.test_data_records (batch_id, entity_table, entity_id) VALUES ($1,'organizations',$2)`, [batch.rows[0].id, org.rows[0].id]);
      for (const [code, name] of [['DEMO-MKS-01','Cabang Demo Makassar'], ['DEMO-JKT-02','Cabang Demo Jakarta']]) {
        const branch = await client.query(`INSERT INTO public.travel_branches (organization_id, branch_code, branch_name) VALUES ($1,$2,$3) RETURNING id`, [org.rows[0].id, code, name]);
        await client.query(`INSERT INTO public.test_data_records (batch_id, entity_table, entity_id) VALUES ($1,'travel_branches',$2)`, [batch.rows[0].id, branch.rows[0].id]);
        await audit(client, request.auth.userId, org.rows[0].id, 'control_center.test_travel_demo.branch_created', 'travel_branch', branch.rows[0].id);
      }
      await audit(client, request.auth.userId, org.rows[0].id, 'control_center.test_travel_demo.created', 'organization', org.rows[0].id);
      await client.query('COMMIT');
      return reply.code(201).send({ organizationId: org.rows[0].id, batchCode: DEMO_BATCH });
    } catch (error) { await client.query('ROLLBACK'); request.log.error({ err: error }, 'Travel demo create failed'); return reply.code(500).send({ code: 'TRAVEL_DEMO_CREATE_FAILED' }); }
    finally { client.release(); }
  });
}
