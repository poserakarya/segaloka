import { createSessionAuth } from "./security/session-auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function registerRegistrationDocumentMetadataRoutes(app, pool) {
  const auth = createSessionAuth(pool);

  app.get(
    "/registration/applications/:id/documents",
    { preHandler: auth },
    async (request, reply) => {
      const { id } = request.params;

      if (!UUID.test(id)) {
        return reply.code(404).send({ code: "APPLICATION_NOT_FOUND" });
      }

      const application = await pool.query(
        `SELECT id FROM public.partner_registration_applications
         WHERE id = $1 AND user_id = $2`,
        [id, request.auth.userId],
      );

      if (!application.rowCount) {
        return reply.code(404).send({ code: "APPLICATION_NOT_FOUND" });
      }

      const documents = await pool.query(
        `SELECT id, document_type, original_name, byte_size, created_at
         FROM public.registration_documents
         WHERE application_id = $1 AND user_id = $2
         ORDER BY created_at DESC, id DESC`,
        [id, request.auth.userId],
      );

      return reply.send({
        items: documents.rows.map((document) => ({
          id: document.id,
          documentType: document.document_type,
          originalName: document.original_name,
          byteSize: document.byte_size,
          createdAt: document.created_at,
        })),
      });
    },
  );
}