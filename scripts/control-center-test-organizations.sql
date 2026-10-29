BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE name LIKE 'SEGALOKA TEST % 20261020'
  ) THEN
    RAISE EXCEPTION 'TEST_BATCH_ALREADY_EXISTS';
  END IF;
END $$;

INSERT INTO public.organizations (name, organization_type, status)
SELECT 'SEGALOKA TEST Travel ' || lpad(n::text, 2, '0') || ' 20261020', 'travel', 'active'
FROM generate_series(1, 5) AS n;

INSERT INTO public.organizations (name, organization_type, status)
SELECT 'SEGALOKA TEST Vendor ' || lpad(n::text, 2, '0') || ' 20261020', 'vendor', 'active'
FROM generate_series(1, 5) AS n;

SELECT id, name, organization_type, status
FROM public.organizations
WHERE name LIKE 'SEGALOKA TEST % 20261020'
ORDER BY organization_type, name;
COMMIT;
