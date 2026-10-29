CREATE TABLE public.travel_partner_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    travel_organization_id UUID NOT NULL
        REFERENCES public.organizations(id),

    partner_user_id UUID NOT NULL
        REFERENCES public.users(id),

    relationship_type TEXT NOT NULL
        CHECK (relationship_type IN ('agent', 'partner')),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'approved',
            'rejected',
            'suspended',
            'terminated'
        )),

    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        status <> 'approved'
        OR (
            approved_by IS NOT NULL
            AND approved_at IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX travel_partner_one_active_travel_idx
ON public.travel_partner_relationships (partner_user_id)
WHERE status IN ('pending', 'approved', 'suspended');

CREATE INDEX travel_partner_organization_idx
ON public.travel_partner_relationships (
    travel_organization_id,
    status
);

CREATE TABLE public.travel_partner_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    relationship_id UUID NOT NULL UNIQUE
        REFERENCES public.travel_partner_relationships(id),

    document_id UUID UNIQUE
        REFERENCES public.documents(id),

    certificate_number TEXT NOT NULL UNIQUE,

    verification_token_hash TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked', 'expired')),

    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        expires_at IS NULL
        OR expires_at > issued_at
    ),

    CHECK (
        status <> 'revoked'
        OR revoked_at IS NOT NULL
    )
);

CREATE INDEX travel_partner_certificate_status_idx
ON public.travel_partner_certificates(status);

-- Pastikan penerbit adalah organisasi Travel.
CREATE OR REPLACE FUNCTION public.enforce_travel_partner_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    issuer_type TEXT;
    issuer_status TEXT;
BEGIN
    SELECT organization_type, status
    INTO issuer_type, issuer_status
    FROM public.organizations
    WHERE id = NEW.travel_organization_id;

    IF issuer_type IS DISTINCT FROM 'travel' THEN
        RAISE EXCEPTION
            'Partner certificate issuer must be a Travel organization';
    END IF;

    IF issuer_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION
            'Travel organization must be active';
    END IF;

    IF NEW.status = 'approved' THEN
        IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
            RAISE EXCEPTION
                'Approved relationship requires approval metadata';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.memberships m
            JOIN public.roles r ON r.id = m.role_id
            WHERE m.user_id = NEW.approved_by
              AND m.organization_id = NEW.travel_organization_id
              AND r.code = 'travel'
        ) THEN
            RAISE EXCEPTION
                'Approver must belong to the issuing Travel';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_travel_partner_rules_trigger
BEFORE INSERT OR UPDATE
ON public.travel_partner_relationships
FOR EACH ROW
EXECUTE FUNCTION public.enforce_travel_partner_rules();

-- Sertifikat hanya dapat dibuat dari hubungan yang disetujui.
CREATE OR REPLACE FUNCTION public.enforce_partner_certificate_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    relationship_status TEXT;
    issuer_status TEXT;
BEGIN
    SELECT rel.status, org.status
    INTO relationship_status, issuer_status
    FROM public.travel_partner_relationships rel
    JOIN public.organizations org
      ON org.id = rel.travel_organization_id
    WHERE rel.id = NEW.relationship_id;

    IF relationship_status IS DISTINCT FROM 'approved'
       OR issuer_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION
            'Certificate requires an approved active Travel relationship';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_partner_certificate_rules_trigger
BEFORE INSERT OR UPDATE
ON public.travel_partner_certificates
FOR EACH ROW
EXECUTE FUNCTION public.enforce_partner_certificate_rules();

-- Sertifikat tidak boleh kembali aktif setelah dicabut.
CREATE OR REPLACE FUNCTION public.prevent_partner_certificate_reactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'revoked'
       AND NEW.status = 'active' THEN
        RAISE EXCEPTION
            'Revoked certificate cannot be reactivated';
    END IF;

    IF NEW.status = 'active'
       AND NEW.expires_at IS NOT NULL
       AND NEW.expires_at <= now() THEN
        RAISE EXCEPTION
            'Expired certificate cannot be active';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_partner_certificate_reactivation_trigger
BEFORE INSERT OR UPDATE
ON public.travel_partner_certificates
FOR EACH ROW
EXECUTE FUNCTION public.prevent_partner_certificate_reactivation();

-- Cabut sertifikat saat hubungan tidak lagi disetujui.
CREATE OR REPLACE FUNCTION public.revoke_partner_certificate_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'approved'
       AND NEW.status <> 'approved' THEN

        UPDATE public.travel_partner_certificates
        SET status = 'revoked',
            revoked_at = now()
        WHERE relationship_id = NEW.id
          AND status = 'active';

    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER revoke_partner_certificate_on_status_change_trigger
AFTER UPDATE OF status
ON public.travel_partner_relationships
FOR EACH ROW
EXECUTE FUNCTION public.revoke_partner_certificate_on_status_change();