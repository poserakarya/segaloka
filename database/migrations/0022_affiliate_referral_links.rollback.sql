-- Disable the Affiliate referral-link API without deleting tables or data.
-- To re-enable it, reapply only the permission-grant INSERT statements
-- from migration 0022; do not rerun its CREATE TABLE statement.

BEGIN;

DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'affiliate'
  AND p.code IN (
      'affiliate.referral_links.read',
      'affiliate.referral_links.manage'
  );

COMMIT;
