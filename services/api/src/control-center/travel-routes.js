import { createSessionAuth } from '../security/session-auth.js';
import PDFDocument from 'pdfkit';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parsePage(query) {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(query?.limit || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT)
  );
  const offset = Math.max(0, Number.parseInt(query?.offset || '0', 10) || 0);
  const search = typeof query?.q === 'string' ? query.q.trim().slice(0, 120) : '';
  const status = ['active', 'review', 'inactive'].includes(query?.status) ? query.status : '';
  const lang = ['id', 'en', 'ar'].includes(query?.lang) ? query.lang : 'id';
  return { limit, offset, search, status, lang };
}

export { createTravelReportPdf };

async function requireSuperAdmin(pool, userId) {
  const result = await pool.query(
    `SELECT 1
     FROM public.memberships m
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1
       AND m.organization_id IS NULL
       AND r.code = 'super_admin'
     LIMIT 1`,
    [userId]
  );
  return result.rowCount > 0;
}

function createTravelReportPdf(rows, generatedAt, lang = 'id') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const labels = ({
      id: { control: 'CONTROL CENTER', title: 'Laporan Data Travel', created: 'Dibuat', total: 'Total Travel', active: 'Travel aktif', branches: 'Cabang aktif', quota: 'Kuota cabang', statuses: { active: 'Aktif', review: 'Review', inactive: 'Nonaktif' }, headers: ['No', 'Nama Travel', 'ID Travel', 'Status', 'Legalitas', 'Langganan', 'Member', 'Cabang'], page: 'Halaman', locale: 'id-ID' },
      en: { control: 'CONTROL CENTER', title: 'Travel Data Report', created: 'Created', total: 'Total Travels', active: 'Active Travels', branches: 'Active branches', quota: 'Branch quota', statuses: { active: 'Active', review: 'Review', inactive: 'Inactive' }, headers: ['No', 'Travel Name', 'Travel ID', 'Status', 'Legality', 'Subscription', 'Member', 'Branches'], page: 'Page', locale: 'en-US' },
      ar: { control: 'مركز التحكم', title: 'تقرير بيانات شركات السفر', created: 'تاريخ الإنشاء', total: 'إجمالي شركات السفر', active: 'الشركات النشطة', branches: 'الفروع النشطة', quota: 'حصة الفروع', statuses: { active: 'نشط', review: 'قيد المراجعة', inactive: 'غير نشط' }, headers: ['الرقم', 'اسم السفر', 'معرّف السفر', 'الحالة', 'الترخيص', 'الاشتراك', 'العضوية', 'الفروع'], page: 'صفحة', locale: 'ar-SA' }
    })[lang] || ({ control: 'CONTROL CENTER', title: 'Laporan Data Travel', created: 'Dibuat', total: 'Total Travel', active: 'Travel aktif', branches: 'Cabang aktif', quota: 'Kuota cabang', headers: ['No', 'Nama Travel', 'ID Travel', 'Status', 'Legalitas', 'Langganan', 'Member', 'Cabang'], page: 'Halaman' });
    const widths = [34, 190, 112, 78, 78, 88, 76, 73];
    const formattedDate = new Intl.DateTimeFormat(labels.locale || 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(generatedAt));
    const pageBottom = 540;
    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#17324d').text(`SEGALOKA — ${labels.control}`, 36, 28);
      doc.fontSize(17).fillColor('#111827').text(labels.title, 36, 47);
      const activeCount = rows.filter(row => row.status === 'active').length;
      const branchCount = rows.reduce((sum, row) => sum + Number(row.branch_count || 0), 0);
      const quotaCount = rows.reduce((sum, row) => sum + Number(row.branch_quota || 0), 0);
      doc.font('Helvetica').fontSize(8).fillColor('#4b5563').text(`${labels.created}: ${formattedDate}`, 36, 70);
      doc.text(`${labels.total}: ${rows.length} · ${labels.active}: ${activeCount} · ${labels.branches}: ${branchCount} · ${labels.quota}: ${quotaCount}`, 36, 82);
      let x = 36;
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff');
      labels.headers.forEach((header, i) => {
        doc.rect(x, 92, widths[i], 22).fill('#315b7d');
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF').text(header, x + 4, 99, {
          width: widths[i] - 8,
          height: 10,
          align: lang === 'ar' ? 'right' : 'left',
          lineBreak: false,
          ellipsis: false
        });
        x += widths[i];
      });
      return 114;
    };
    let y = drawHeader();
    rows.forEach((row, index) => {
      const values = [index + 1, row.name, row.id, labels.statuses?.[row.status] || '—', row.legal_status || '—', row.subscription_plan || '—', row.membership_count ?? '—', `${row.branch_count ?? '—'} / ${row.branch_quota ?? '—'}`];
      const rowHeight = Math.min(42, Math.max(22, ...values.map((value, i) => Math.ceil(String(value).length / Math.max(8, Math.floor(widths[i] / 5))) * 10 + 8)));
      if (y + rowHeight > pageBottom) { doc.addPage(); y = drawHeader(); }
      let x = 36;
      doc.font('Helvetica').fontSize(7).fillColor('#111827');
      values.forEach((value, i) => { const fill = i === 3 ? ({ active: '#e8f5ee', review: '#fff4db', inactive: '#fce8e8' }[row.status] || '#f8fafc') : (index % 2 ? '#f8fafc' : '#ffffff'); doc.rect(x, y, widths[i], rowHeight).fillAndStroke(fill, '#d1d5db'); doc.fillColor('#111827').text(String(value), x + 4, y + 7, { width: widths[i] - 8, height: rowHeight - 10, lineBreak: true, ellipsis: true, align: lang === 'ar' ? 'right' : 'left' }); x += widths[i]; });
      y += rowHeight;
    });
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) { doc.switchToPage(i); doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(`${labels.page} ${i + 1 - range.start} / ${range.count}`, 36, 548, { align: lang === 'ar' ? 'left' : 'right', width: 729 }); }
    doc.end();
  });
}

export async function registerControlCenterTravelRoutes(app, pool) {
  const requireSession = createSessionAuth(pool);

  app.get('/control-center/travels/export.pdf', { preHandler: requireSession }, async (request, reply) => {
    if (!await requireSuperAdmin(pool, request.auth.userId)) return reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
    const { search, status, lang } = parsePage(request.query);
    const result = await pool.query(
      `SELECT o.id, o.name, o.status,
              COUNT(DISTINCT m.id)::int AS membership_count,
              COUNT(DISTINCT b.id)::int AS branch_count,
              COALESCE((SELECT sp.code FROM public.organization_subscriptions os2 JOIN public.subscription_plans sp ON sp.id = os2.plan_id WHERE os2.organization_id = o.id AND os2.status IN ('pending','trialing','active','past_due','suspended') ORDER BY os2.updated_at DESC LIMIT 1), NULL) AS subscription_plan,
              COALESCE((SELECT l.verification_status FROM public.travel_licenses l WHERE l.organization_id = o.id ORDER BY l.updated_at DESC, l.created_at DESC LIMIT 1), NULL) AS legal_status,
              COALESCE((SELECT jsonb_agg(DISTINCT COALESCE(l.verified_license_type, l.detected_license_type, l.selected_license_type) ORDER BY COALESCE(l.verified_license_type, l.detected_license_type, l.selected_license_type)) FROM public.travel_licenses l WHERE l.organization_id = o.id AND COALESCE(l.verified_license_type, l.detected_license_type, l.selected_license_type) IS NOT NULL), '[]'::jsonb) AS license_types,
              COALESCE(MAX(CASE WHEN e.code = 'branches.manage' THEN COALESCE(oe.limit_value, pe.limit_value) END), 2)::int AS branch_quota
       FROM public.organizations o
       LEFT JOIN public.memberships m ON m.organization_id = o.id
       LEFT JOIN public.travel_branches b ON b.organization_id = o.id
       LEFT JOIN public.organization_subscriptions os ON os.organization_id = o.id AND os.status IN ('pending', 'trialing', 'active', 'past_due', 'suspended')
       LEFT JOIN public.plan_entitlements pe ON pe.plan_id = os.plan_id
       LEFT JOIN public.entitlements e ON e.id = pe.entitlement_id
       LEFT JOIN public.organization_entitlement_overrides oe ON oe.organization_id = o.id AND oe.entitlement_id = e.id
       WHERE o.organization_type = 'travel' AND o.is_test_data = FALSE
         AND ($1 = '' OR o.name ILIKE $2 OR o.id::text ILIKE $2)
         AND ($3 = '' OR o.status = $3)
       GROUP BY o.id, o.name, o.status
       ORDER BY o.name ASC, o.id ASC`,
      [search, `%${search}%`, status]
    );
    const pdf = await createTravelReportPdf(result.rows, new Date().toISOString(), lang);
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="Segaloka-Laporan-Travel-' + new Date().toISOString().slice(0, 10) + '.pdf"');
    return reply.send(pdf);
  });

  app.get('/control-center/travels', {
    preHandler: requireSession
  }, async (request, reply) => {
    if (!await requireSuperAdmin(pool, request.auth.userId)) {
      return reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
    }

    const { limit, offset, search, status } = parsePage(request.query);
    const pattern = `%${search}%`;
    const result = await pool.query(
      `SELECT
         o.id,
         o.name,
         o.status,
         COUNT(DISTINCT m.id)::int AS membership_count,
         COUNT(DISTINCT b.id)::int AS branch_count,
         COALESCE((SELECT sp.code FROM public.organization_subscriptions os2 JOIN public.subscription_plans sp ON sp.id = os2.plan_id WHERE os2.organization_id = o.id AND os2.status IN ('pending','trialing','active','past_due','suspended') ORDER BY os2.updated_at DESC LIMIT 1), NULL) AS subscription_plan,
         COALESCE((SELECT l.verification_status FROM public.travel_licenses l WHERE l.organization_id = o.id ORDER BY l.updated_at DESC, l.created_at DESC LIMIT 1), NULL) AS legal_status,
         COALESCE((SELECT jsonb_agg(DISTINCT COALESCE(l.verified_license_type, l.detected_license_type, l.selected_license_type) ORDER BY COALESCE(l.verified_license_type, l.detected_license_type, l.selected_license_type)) FROM public.travel_licenses l WHERE l.organization_id = o.id AND COALESCE(l.verified_license_type, l.detected_license_type, l.selected_license_type) IS NOT NULL), '[]'::jsonb) AS license_types,
         COALESCE(MAX(CASE
           WHEN e.code = 'branches.manage'
           THEN COALESCE(oe.limit_value, pe.limit_value)
         END), 2)::int AS branch_quota,
         COUNT(*) OVER ()::int AS total_count
       FROM public.organizations o
       LEFT JOIN public.memberships m ON m.organization_id = o.id
       LEFT JOIN public.travel_branches b ON b.organization_id = o.id
       LEFT JOIN public.organization_subscriptions os
         ON os.organization_id = o.id
        AND os.status IN ('pending', 'trialing', 'active', 'past_due', 'suspended')
       LEFT JOIN public.plan_entitlements pe ON pe.plan_id = os.plan_id
       LEFT JOIN public.entitlements e ON e.id = pe.entitlement_id
       LEFT JOIN public.organization_entitlement_overrides oe
         ON oe.organization_id = o.id
        AND oe.entitlement_id = e.id
       WHERE o.organization_type = 'travel' AND o.is_test_data = FALSE
         AND ($1 = '' OR o.name ILIKE $2 OR o.id::text ILIKE $2)
         AND ($5 = '' OR o.status = $5)
       GROUP BY o.id, o.name, o.status
       ORDER BY o.name ASC, o.id ASC
       LIMIT $3 OFFSET $4`,
      [search, pattern, limit, offset, status]
    );

    return {
      source: 'postgresql',
      items: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        status: row.status,
        membershipCount: row.membership_count,
        branchCount: row.branch_count,
              branchQuota: row.branch_quota,
              subscriptionPlan: row.subscription_plan,
              legalStatus: row.legal_status,
              licenseTypes: row.license_types || []
      })),
      pagination: {
        limit,
        offset,
        total: result.rows[0]?.total_count || 0
      }
    };
  });

  app.get('/control-center/travels/:id', {
    preHandler: requireSession
  }, async (request, reply) => {
    if (!await requireSuperAdmin(pool, request.auth.userId)) {
      return reply.code(403).send({ code: 'SUPER_ADMIN_ACCESS_REQUIRED' });
    }

    const result = await pool.query(
      `SELECT
         o.id,
         o.name,
         o.organization_type,
         o.status,
         COUNT(DISTINCT m.id)::int AS membership_count,
         COUNT(DISTINCT b.id)::int AS branch_count,
         COALESCE(MAX(CASE
           WHEN e.code = 'branches.manage'
           THEN COALESCE(oe.limit_value, pe.limit_value)
         END), 2)::int AS branch_quota
       FROM public.organizations o
       LEFT JOIN public.memberships m ON m.organization_id = o.id
       LEFT JOIN public.travel_branches b ON b.organization_id = o.id
       LEFT JOIN public.organization_subscriptions os
         ON os.organization_id = o.id
        AND os.status IN ('pending', 'trialing', 'active', 'past_due', 'suspended')
       LEFT JOIN public.plan_entitlements pe ON pe.plan_id = os.plan_id
       LEFT JOIN public.entitlements e ON e.id = pe.entitlement_id
       LEFT JOIN public.organization_entitlement_overrides oe
         ON oe.organization_id = o.id
        AND oe.entitlement_id = e.id
       WHERE o.id = $1
         AND o.organization_type = 'travel' AND o.is_test_data = FALSE
       GROUP BY o.id, o.name, o.organization_type, o.status`,
      [request.params.id]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ code: 'TRAVEL_NOT_FOUND' });
    }

    const licenses = await pool.query(
      `SELECT l.id, l.selected_license_type, l.detected_license_type,
              l.verified_license_type, l.document_storage_key,
              l.verification_status, l.verified_at, l.created_at, l.updated_at
       FROM public.travel_licenses l
       WHERE l.organization_id = $1
       ORDER BY l.created_at ASC, l.id ASC`,
      [request.params.id]
    );

    return {
      source: 'postgresql',
      travel: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        organizationType: result.rows[0].organization_type,
        status: result.rows[0].status,
        membershipCount: result.rows[0].membership_count,
        branchCount: result.rows[0].branch_count,
        branchQuota: result.rows[0].branch_quota,
        licenses: licenses.rows.map(row => ({
          id: row.id,
          selectedLicenseType: row.selected_license_type,
          detectedLicenseType: row.detected_license_type,
          verifiedLicenseType: row.verified_license_type,
          documentStorageKey: row.document_storage_key,
          verificationStatus: row.verification_status,
          verifiedAt: row.verified_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      }
    };
  });
}
