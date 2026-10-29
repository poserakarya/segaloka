import { randomBytes, createHash } from 'node:crypto';
import { createSessionAuth } from '../security/session-auth.js';
import { isTestDataOrganization } from '../security/test-data-policy.js';

export async function registerDocumentRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/documents/types', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const result = await pool.query(
      `SELECT id, code, name, category
       FROM public.document_types
       WHERE is_active = true
       ORDER BY category, name`
    );

    return { items: result.rows };
  });

  app.get('/documents/templates', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const organizationId = request.query?.organizationId;

    if (
      typeof organizationId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)
    ) {
      return reply.code(400).send({
        code: 'INVALID_ORGANIZATION_ID'
      });
    }

    const access = await pool.query(
      `SELECT 1
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       JOIN public.organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1
         AND m.organization_id = $2
         AND o.status = 'active'
         AND r.code IN ('travel', 'vendor')
       LIMIT 1`,
      [request.auth.userId, organizationId]
    );

    if (access.rows.length === 0) {
      return reply.code(403).send({
        code: 'ORGANIZATION_ACCESS_DENIED'
      });
    }

    const result = await pool.query(
      `SELECT
         t.id,
         t.name,
         t.version,
         t.status,
         t.document_type_id,
         d.code AS document_type,
         t.layout,
         t.field_schema
       FROM public.document_templates t
       JOIN public.document_types d
         ON d.id = t.document_type_id
       WHERE (
         t.organization_id = $1
         OR (
           t.organization_id IS NULL
           AND t.status = 'published'
         )
       )
       ORDER BY d.code, t.name, t.version DESC
       LIMIT 200`,
      [organizationId]
    );

    return { items: result.rows };
  });

  app.post('/documents', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const body = request.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return reply.code(400).send({ code: 'INVALID_BODY' });
    }

    const {
      organizationId,
      documentTypeId,
      templateId = null,
      data = {}
    } = body;

    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      typeof organizationId !== 'string' ||
      !uuid.test(organizationId) ||
      typeof documentTypeId !== 'string' ||
      !uuid.test(documentTypeId) ||
      (templateId !== null &&
        (typeof templateId !== 'string' || !uuid.test(templateId))) ||
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      return reply.code(400).send({ code: 'INVALID_DOCUMENT_INPUT' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const access = await client.query(
        `SELECT 1
         FROM public.memberships m
         JOIN public.roles r ON r.id = m.role_id
         JOIN public.organizations o ON o.id = m.organization_id
         WHERE m.user_id = $1
           AND m.organization_id = $2
           AND o.status = 'active'
           AND r.code IN ('travel', 'vendor')
         LIMIT 1`,
        [request.auth.userId, organizationId]
      );

      if (access.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'ORGANIZATION_ACCESS_DENIED'
        });
      }

      if (await isTestDataOrganization(client, organizationId)) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'TEST_DATA_DOCUMENT_NOT_ALLOWED'
        });
      }

      const type = await client.query(
        `SELECT code
         FROM public.document_types
         WHERE id = $1 AND is_active = true`,
        [documentTypeId]
      );

      if (type.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(400).send({
          code: 'INVALID_DOCUMENT_TYPE'
        });
      }

      if (type.rows[0].code === 'TRAVEL_CERTIFICATE') {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'TRAVEL_CERTIFICATE_REQUIRES_VERIFIED_DEPARTURE'
        });
      }
      if (templateId !== null) {
        const template = await client.query(
          `SELECT 1
           FROM public.document_templates
           WHERE id = $1
             AND document_type_id = $2
             AND status = 'published'
             AND (
               organization_id = $3
               OR organization_id IS NULL
             )`,
          [templateId, documentTypeId, organizationId]
        );

        if (template.rows.length === 0) {
          await client.query('ROLLBACK');
          return reply.code(400).send({
            code: 'INVALID_DOCUMENT_TEMPLATE'
          });
        }
      }

      const documentNumber =
        'SEG-' + randomBytes(16).toString('hex').toUpperCase();

      const verificationToken = randomBytes(32).toString('hex');

      const verificationTokenHash = createHash('sha256')
        .update(verificationToken)
        .digest('hex');

      const inserted = await client.query(
        `INSERT INTO public.documents (
           organization_id,
           document_type_id,
           template_id,
           document_number,
           verification_token_hash,
           status,
           data,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, 'draft', $6::jsonb, $7)
         RETURNING id, document_number, status, created_at`,
        [
          organizationId,
          documentTypeId,
          templateId,
          documentNumber,
          verificationTokenHash,
          JSON.stringify(data),
          request.auth.userId
        ]
      );

      const document = inserted.rows[0];

      await client.query(
        `INSERT INTO public.document_events (
           document_id,
           actor_user_id,
           action,
           metadata
         )
         VALUES ($1, $2, 'created', '{}'::jsonb)`,
        [document.id, request.auth.userId]
      );

      await client.query('COMMIT');

      return reply.code(201).send({
        document,
        verificationToken
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        request.log.error({ err: rollbackError }, 'Document rollback failed');
      }

      request.log.error({ err: error }, 'Document creation failed');

      return reply.code(500).send({
        code: 'DOCUMENT_CREATION_FAILED'
      });
    } finally {
      client.release();
    }
  });


  app.post('/documents/:id/issue', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const documentId = request.params.id;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid.test(documentId)) {
      return reply.code(400).send({
        code: 'INVALID_DOCUMENT_ID'
      });
    }

    const client = await pool.connect();
    let committed = false;

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT
           d.id,
           d.organization_id,
           d.status,
           d.data,
           d.document_number,
           dt.code AS document_type
         FROM public.documents d
         JOIN public.document_types dt
           ON dt.id = d.document_type_id
         WHERE d.id = $1
         FOR UPDATE OF d`,
        [documentId]
      );

      const document = result.rows[0];

      if (!document) {
        await client.query('ROLLBACK');
        return reply.code(404).send({
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      const access = await client.query(
        `SELECT 1
         FROM public.memberships m
         JOIN public.roles r ON r.id = m.role_id
         JOIN public.organizations o ON o.id = m.organization_id
         WHERE m.user_id = $1
           AND m.organization_id = $2
           AND o.status = 'active'
           AND r.code IN ('travel', 'vendor')
         LIMIT 1`,
        [request.auth.userId, document.organization_id]
      );

      if (access.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'ORGANIZATION_ACCESS_DENIED'
        });
      }

      if (await isTestDataOrganization(client, document.organization_id)) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'TEST_DATA_DOCUMENT_NOT_ALLOWED'
        });
      }

      if (document.document_type === 'TRAVEL_CERTIFICATE') {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'TRAVEL_CERTIFICATE_REQUIRES_VERIFIED_DEPARTURE'
        });
      }
      if (document.status !== 'draft') {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'DOCUMENT_NOT_DRAFT'
        });
      }

      const revision = await client.query(
        `INSERT INTO public.document_revisions (
           document_id,
           revision_number,
           data_snapshot,
           created_by
         )
         VALUES ($1, 1, $2::jsonb, $3)
         RETURNING id, revision_number`,
        [
          document.id,
          JSON.stringify(document.data),
          request.auth.userId
        ]
      );

      const updated = await client.query(
        `UPDATE public.documents
         SET status = 'issued',
             issued_at = now(),
             updated_at = now()
         WHERE id = $1
           AND status = 'draft'
         RETURNING id, document_number, status, issued_at`,
        [document.id]
      );

      if (updated.rows.length !== 1) {
        throw new Error('DOCUMENT_ISSUE_CONFLICT');
      }

      await client.query(
        `INSERT INTO public.document_events (
           document_id,
           actor_user_id,
           action,
           metadata
         )
         VALUES (
           $1,
           $2,
           'issued',
           jsonb_build_object('revision', 1)
         )`,
        [document.id, request.auth.userId]
      );

      await client.query('COMMIT');
      committed = true;

      return reply.code(200).send({
        document: updated.rows[0],
        revision: revision.rows[0]
      });
    } catch (error) {
      if (!committed) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          request.log.error(
            { err: rollbackError },
            'Document issue rollback failed'
          );
        }
      }

      request.log.error(
        { err: error },
        'Document issuance failed'
      );

      return reply.code(500).send({
        code: 'DOCUMENT_ISSUE_FAILED'
      });
    } finally {
      client.release();
    }
  });


  app.get('/documents/:id', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const documentId = request.params.id;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid.test(documentId)) {
      return reply.code(400).send({
        code: 'INVALID_DOCUMENT_ID'
      });
    }

    try {
      const result = await pool.query(
        `SELECT
           d.id,
           d.organization_id,
           d.document_type_id,
           dt.code AS document_type,
           d.template_id,
           d.document_number,
           d.status,
           d.data,
           d.storage_key,
           d.issued_at,
           d.created_at,
           d.updated_at
         FROM public.documents d
         JOIN public.document_types dt
           ON dt.id = d.document_type_id
         JOIN public.organizations o
           ON o.id = d.organization_id
         WHERE d.id = $1
           AND o.status = 'active'
           AND EXISTS (
             SELECT 1
             FROM public.memberships m
             JOIN public.roles r ON r.id = m.role_id
             WHERE m.user_id = $2
               AND m.organization_id = d.organization_id
               AND r.code IN ('travel', 'vendor')
           )
         LIMIT 1`,
        [documentId, request.auth.userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      return reply.code(200).send({
        document: result.rows[0]
      });
    } catch (error) {
      request.log.error(
        { err: error },
        'Document read failed'
      );

      return reply.code(500).send({
        code: 'DOCUMENT_READ_FAILED'
      });
    }
  });

}
