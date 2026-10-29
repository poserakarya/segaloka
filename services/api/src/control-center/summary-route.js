import { createSessionAuth } from '../security/session-auth.js';

export async function registerControlCenterSummaryRoute(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/control-center/summary', {
    preHandler: requireSession
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const membership = await pool.query(
      `SELECT 1
       FROM public.memberships m
       JOIN public.roles r ON r.id = m.role_id
       WHERE m.user_id = $1
         AND r.code = 'super_admin'
         AND m.organization_id IS NULL
       LIMIT 1`,
      [request.auth.userId]
    );

    if (membership.rowCount === 0) {
      return reply.code(403).send({
        code: 'SUPER_ADMIN_ACCESS_REQUIRED'
      });
    }

    const result = await pool.query(`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM public.organizations
          WHERE organization_type = 'travel' AND is_test_data = FALSE
        ) AS total_travel,

        (
          SELECT COUNT(*)::int
          FROM public.organizations
          WHERE organization_type = 'vendor' AND is_test_data = FALSE
        ) AS total_vendor,

        (
          SELECT COUNT(*)::int
          FROM public.travel_bookings
        ) AS total_bookings,

        (
          SELECT COUNT(*)::int
          FROM public.travel_departures
        ) AS total_departures,

        (
          SELECT COUNT(*)::int
          FROM public.organization_subscriptions
        ) AS total_subscriptions,

        (
          SELECT COUNT(*)::int
          FROM public.travel_licenses
        ) AS total_travel_licenses
    `);

    /* SEGALOKA_APPROVAL_SUMMARY_Q405 */
    const approvalResult = await pool.query(`
      SELECT
        category,
        COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
        COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE status = 'revision_required')::int AS revision_required
      FROM (
        SELECT application_type AS category, status
        FROM public.partner_registration_applications
        WHERE application_type IN ('travel', 'vendor')

        UNION ALL

        SELECT 'affiliate' AS category, status
        FROM public.affiliate_applications
      ) applications
      GROUP BY category
    `);

    const approvalCategories = {
      travel: { submitted: 0, underReview: 0, revisionRequired: 0 },
      vendor: { submitted: 0, underReview: 0, revisionRequired: 0 },
      affiliate: { submitted: 0, underReview: 0, revisionRequired: 0 }
    };

    for (const row of approvalResult.rows) {
      if (!Object.prototype.hasOwnProperty.call(approvalCategories, row.category)) continue;
      approvalCategories[row.category] = {
        submitted: row.submitted,
        underReview: row.under_review,
        revisionRequired: row.revision_required
      };
    }

    const approvalTotals = Object.values(approvalCategories).reduce(
      (totals, item) => ({
        submitted: totals.submitted + item.submitted,
        underReview: totals.underReview + item.underReview,
        revisionRequired: totals.revisionRequired + item.revisionRequired
      }),
      { submitted: 0, underReview: 0, revisionRequired: 0 }
    );

    const approvalSummary = {
      categories: approvalCategories,
      totals: {
        ...approvalTotals,
        pending: approvalTotals.submitted + approvalTotals.underReview,
        needsAttention: approvalTotals.submitted +
          approvalTotals.underReview + approvalTotals.revisionRequired
      }
    };

    const data = result.rows[0];

    return {
      source: 'postgresql',
      realtime: false,
      approvalSummary,
      metrics: {
        totalTravel: data.total_travel,
        totalVendor: data.total_vendor,
        totalBookings: data.total_bookings,
        totalDepartures: data.total_departures,
        totalSubscriptions: data.total_subscriptions,
        totalTravelLicenses: data.total_travel_licenses
      }
    };
  });
}