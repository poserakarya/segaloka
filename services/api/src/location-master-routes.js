import { createSessionAuth } from './security/session-auth.js';

export async function registerLocationMasterRoutes(app, pool) {
  app.get('/master-data/countries', async () => ({ items: (await pool.query("SELECT c.id,c.iso2,c.iso3,c.name,        c.phone_code AS \"phoneCode\",        (SELECT COUNT(*)::int         FROM public.master_regions r         WHERE r.country_id=c.id AND r.is_active=true) AS \"regionCount\",        (SELECT COUNT(*)::int         FROM public.master_cities t         WHERE t.country_id=c.id AND t.is_active=true) AS \"cityCount\" FROM public.master_countries c WHERE c.is_active=true ORDER BY c.name")).rows }));
  app.get('/master-data/countries/:countryId/regions', async (req, rep) => { const q = await pool.query("SELECT id,code,name,region_type AS \"regionType\" FROM public.master_regions WHERE country_id=$1 AND is_active=true ORDER BY name", [req.params.countryId]); return { items: q.rows }; });
  app.get('/master-data/regions/:regionId/cities', async (req, rep) => {
    const { regionId } = req.params;

    if (!/^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(regionId)) {
      return rep.code(400).send({ code: 'INVALID_REGION_ID' });
    }

    const region = await pool.query(
      `SELECT r.id, c.iso2
       FROM public.master_regions r
       JOIN public.master_countries c ON c.id = r.country_id
       WHERE r.id = $1
         AND r.is_active = true
         AND c.is_active = true`,
      [regionId]
    );

    if (!region.rowCount) {
      return rep.code(404).send({ code: 'REGION_NOT_FOUND' });
    }

    if (region.rows[0].iso2 === 'ID') {
      const result = await pool.query(
        `SELECT id, name, code, type
         FROM public.master_id_regencies
         WHERE province_id = $1
           AND is_active = true
         ORDER BY name`,
        [regionId]
      );

      return { items: result.rows };
    }

    const result = await pool.query(
      `SELECT id, name, external_id AS "externalId"
       FROM public.master_cities
       WHERE region_id = $1
         AND is_active = true
       ORDER BY name`,
      [regionId]
    );

    return { items: result.rows };
  });
  app.get('/master-data/countries/:countryId/cities', async (req, rep) => {
    const { countryId } = req.params;

    if (!/^[0-9a-fA-F-]{36}$/.test(countryId)) {
      return rep.code(400).send({ code: 'INVALID_COUNTRY_ID' });
    }

    const result = await pool.query(
      `SELECT id, name, external_id AS "externalId"
       FROM public.master_cities
       WHERE country_id = $1
         AND region_id IS NULL
         AND is_active = true
       ORDER BY name`,
      [countryId]
    );

    return { items: result.rows };
  });
  const auth = createSessionAuth(pool);
  const admin = async (req, rep) => { await auth(req, rep); if (rep.sent) return false; const q = await pool.query("SELECT 1 FROM public.memberships m JOIN public.roles r ON r.id=m.role_id WHERE m.user_id=$1 AND m.organization_id IS NULL AND r.code='super_admin'", [req.auth.userId]); if (!q.rowCount) { rep.code(403).send({ code: 'SUPER_ADMIN_REQUIRED' }); return false; } return true; };
  app.get('/admin/registration-country-settings', { preHandler: admin }, async () => ({ items: (await pool.query("SELECT c.id,c.iso2,c.iso3,c.name,s.allow_travel AS allowTravel,s.allow_vendor AS allowVendor FROM public.master_countries c LEFT JOIN public.registration_country_settings s ON s.country_id=c.id WHERE c.is_active=true ORDER BY c.name")).rows }));
  app.put('/admin/registration-country-settings/:countryId', { preHandler: admin }, async (req, rep) => { const b=req.body||{}; if(typeof b.allowTravel!=="boolean"||typeof b.allowVendor!=="boolean") return rep.code(400).send({code:'INVALID_COUNTRY_SETTINGS'}); const x=await pool.query("INSERT INTO public.registration_country_settings(country_id,allow_travel,allow_vendor,updated_by,updated_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(country_id) DO UPDATE SET allow_travel=excluded.allow_travel,allow_vendor=excluded.allow_vendor,updated_by=excluded.updated_by,updated_at=now() RETURNING *",[req.params.countryId,b.allowTravel,b.allowVendor,req.auth.userId]); if(!x.rowCount)return rep.code(404).send({code:'COUNTRY_NOT_FOUND'}); await pool.query("INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id) VALUES($1,'registration.country_settings.updated','registration_country_setting',$2)",[req.auth.userId,req.params.countryId]); return x.rows[0]; });
}
