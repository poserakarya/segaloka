-- Segaloka Travel Branches
-- DRAFT ONLY: review required; do not apply automatically.

BEGIN;

CREATE TABLE public.travel_branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL
        REFERENCES public.organizations(id),
    branch_code text NOT NULL,
    branch_name text NOT NULL,
    address text,
    country_code text,
    province text,
    city text,
    postal_code text,
    phone text,
    email text,
    person_in_charge text,
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, branch_code)
);

CREATE INDEX travel_branches_organization_idx
    ON public.travel_branches(organization_id);

CREATE INDEX travel_branches_status_idx
    ON public.travel_branches(organization_id, status);

CREATE OR REPLACE FUNCTION public.enforce_travel_branch_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    organization_type text;
BEGIN
    SELECT o.organization_type
      INTO organization_type
      FROM public.organizations o
     WHERE o.id = NEW.organization_id
     FOR SHARE;

    IF organization_type IS DISTINCT FROM 'travel' THEN
        RAISE EXCEPTION 'Branch parent must be a Travel organization';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER travel_branches_parent_check
BEFORE INSERT OR UPDATE OF organization_id
ON public.travel_branches
FOR EACH ROW
EXECUTE FUNCTION public.enforce_travel_branch_parent();

COMMIT;
