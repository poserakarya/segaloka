import { createSessionAuth } from '../security/session-auth.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registerCertificateRevokeRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.post('/travel/certificates/:id/revoke', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const certificateId = request.params.id;

    if (!UUID.test(certificateId)) {
      return reply.code(400).send({
        code: 'INVALID_CERTIFICATE_ID'
      });
    }

    const client = await pool.connect();
    let committed = false;

    try {
      await client.query('BEGIN');

      const found = await client.query(
        `SELECT
           tc.id AS certificate_id,
           doc.id AS document_id,
           doc.organization_id,
           doc.status AS document_status
         FROM public.traveler_travel_certificates tc
         JOIN public.documents doc
           ON doc.id = tc.document_id
         JOIN public.document_types dt
           ON dt.id = doc.document_type_id
         WHERE tc.id = $1
           AND dt.code = 'TRAVEL_CERTIFICATE'
         FOR UPDATE OF doc`,
        [certificateId]
      );

      const certificate = found.rows[0];

      if (!certificate) {
        await client.query('ROLLBACK');
        return reply.code(404).send({
          code: 'CERTIFICATE_NOT_FOUND'
        });
      }

      const permission = await client.query(
        `SELECT 1
         FROM public.memberships m
         JOIN public.roles r ON r.id = m.role_id
         JOIN public.organizations o ON o.id = m.organization_id
         JOIN public.role_permissions rp ON rp.role_id = m.role_id
         JOIN public.permissions p ON p.id = rp.permission_id
         WHERE m.user_id = $1
           AND m.organization_id = $2
           AND r.code = 'travel'
           AND o.organization_type = 'travel'
           AND o.status = 'active'
           AND p.code = 'travel.certificates.revoke'
         LIMIT 1`,
        [request.auth.userId, certificate.organization_id]
      );

      if (permission.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(403).send({
          code: 'CERTIFICATE_REVOKE_ACCESS_DENIED'
        });
      }

      if (certificate.document_status === 'void') {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'CERTIFICATE_ALREADY_REVOKED'
        });
      }

      if (!['issued', 'revised'].includes(certificate.document_status)) {
        await client.query('ROLLBACK');
        return reply.code(409).send({
          code: 'CERTIFICATE_NOT_ISSUED'
        });
      }

      await client.query(
        `UPDATE public.documents
         SET status = 'void',
             updated_at = now()
         WHERE id = $1`,
        [certificate.document_id]
      );

      await client.query(
        `INSERT INTO public.document_events (
           document_id, actor_user_id, action, metadata
         )
         VALUES ($1, $2, 'revoked', '{"source":"travel_certificate"}'::jsonb)`,
        [certificate.document_id, request.auth.userId]
      );

      await client.query(
        `INSERT INTO public.audit_logs (
           actor_user_id, organization_id, action,
           entity_type, entity_id
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          request.auth.userId,
          certificate.organization_id,
          'travel.traveler_certificate.revoked',
          'traveler_travel_certificate',
          certificate.certificate_id
        ]
      );

      await client.query('COMMIT');
      committed = true;

      return reply.code(200).send({
        revoked: true,
        certificateId: certificate.certificate_id,
        documentStatus: 'void'
      });
    } catch (error) {
      if (!committed) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          request.log.error(
            { err: rollbackError },
            'Certificate revoke rollback failed'
          );
        }
      }

      request.log.error(
        { err: error },
        'Certificate revocation failed'
      );

      return reply.code(500).send({
        code: 'CERTIFICATE_REVOCATION_FAILED'
      });
    } finally {
      client.release();
    }
  });
}