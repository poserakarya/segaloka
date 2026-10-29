import { createSessionAuth } from '../security/session-auth.js';

const MAX_LIMIT = 100;
function page(query) {
  return {
    limit: Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query?.limit || '25', 10) || 25)),
    offset: Math.max(0, Number.parseInt(query?.offset || '0', 10) || 0),
    q: typeof query?.q === 'string' ? query.q.trim().slice(0, 120) : '',
    status: typeof query?.status === 'string' ? query.status.trim() : ''
  };
}
async function isSuperAdmin(pool, userId) {
  const r = await pool.query(`SELECT 1 FROM public.memberships m JOIN public.roles r ON r.id=m.role_id WHERE m.user_id=$1 AND m.organization_id IS NULL AND r.code='super_admin' LIMIT 1`, [userId]);
  return r.rowCount > 0;
}
export async function registerControlCenterBookingRoutes(app, pool) {
  const auth = createSessionAuth(pool);
  app.get('/control-center/bookings', { preHandler: auth }, async (request, reply) => {
    if (!await isSuperAdmin(pool, request.auth.userId)) return reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
    const { limit, offset, q, status } = page(request.query);
    const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    const validStatus = statuses.includes(status) ? status : '';
    const result = await pool.query(`
      SELECT b.id, b.booking_number, b.status, b.created_at, d.title, d.destination,
             d.departure_date, d.return_date, COUNT(p.id)::int AS participant_count,
             COUNT(*) OVER()::int AS total_count
      FROM public.travel_bookings b
      JOIN public.travel_departures d ON d.id=b.departure_id
      JOIN public.organizations o ON o.id=d.travel_organization_id
      LEFT JOIN public.travel_booking_participants p ON p.booking_id=b.id
      WHERE o.organization_type='travel' AND o.is_test_data = FALSE
        AND ($1='' OR b.booking_number ILIKE $2 OR d.title ILIKE $2 OR d.destination ILIKE $2)
        AND ($3='' OR b.status=$3)
      GROUP BY b.id,d.id ORDER BY b.created_at DESC,b.id LIMIT $4 OFFSET $5`,
      [q, `%${q}%`, validStatus, limit, offset]
    );
    return { source: 'postgresql', items: result.rows.map(r => ({ id: r.id, bookingNumber: r.booking_number, status: r.status, createdAt: r.created_at, departure: { title: r.title, destination: r.destination, departureDate: r.departure_date, returnDate: r.return_date }, participantCount: r.participant_count })), pagination: { limit, offset, total: result.rows[0]?.total_count || 0 } };
  });
}
