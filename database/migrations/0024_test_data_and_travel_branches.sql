-- Segaloka migration 0024
-- Test-data registry and Travel branches.
-- Apply only through the repository migration mechanism after isolated testing.

BEGIN;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS organizations_type_test_idx
    ON public.organizations (organization_type, is_test_data, status);

CREATE TABLE IF NOT EXISTS public.test_data_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code TEXT NOT NULL UNIQUE,
    description TEXT,
    environment TEXT NOT NULL DEFAULT 'local'
        CHECK (environment IN ('local', 'development')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cleaning', 'cleaned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cleaned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.test_data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.test_data_batches(id),
    entity_table TEXT NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (batch_id, entity_table, entity_id)
);

CREATE INDEX IF NOT EXISTS test_data_records_entity_idx
    ON public.test_data_records(entity_table, entity_id);

CREATE TABLE IF NOT EXISTS public.travel_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_code TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    address TEXT,
    country_code TEXT,
    province TEXT,
    city TEXT,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    person_in_charge TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, branch_code)
);

CREATE INDEX IF NOT EXISTS travel_branches_organization_idx
    ON public.travel_branches(organization_id);

CREATE INDEX IF NOT EXISTS travel_branches_status_idx
    ON public.travel_branches(organization_id, status);

CREATE OR REPLACE FUNCTION public.enforce_travel_branch_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_type TEXT;
BEGIN
    SELECT o.organization_type
      INTO parent_type
      FROM public.organizations o
     WHERE o.id = NEW.organization_id
     FOR SHARE;

    IF parent_type IS DISTINCT FROM 'travel' THEN
        RAISE EXCEPTION 'Branch parent must be a Travel organization';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS travel_branches_parent_check ON public.travel_branches;
CREATE TRIGGER travel_branches_parent_check
BEFORE INSERT OR UPDATE OF organization_id
ON public.travel_branches
FOR EACH ROW
EXECUTE FUNCTION public.enforce_travel_branch_parent();

INSERT INTO public.schema_migrations (version)
VALUES ('0024_test_data_and_travel_branches')
ON CONFLICT (version) DO NOTHING;

COMMIT;
