BEGIN;

-- Jenis izin usaha yang didukung Segaloka.
CREATE TABLE public.travel_license_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.travel_license_types (code, name)
VALUES
    ('BPW', 'Biro Perjalanan Wisata'),
    ('PPIU', 'Penyelenggara Perjalanan Ibadah Umrah'),
    ('PIHK', 'Penyelenggara Ibadah Haji Khusus');

-- Dokumen dan hasil pemeriksaan perizinan Travel.
CREATE TABLE public.travel_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id),
    selected_license_type TEXT NOT NULL
        REFERENCES public.travel_license_types(code),
    detected_license_type TEXT
        REFERENCES public.travel_license_types(code),
    verified_license_type TEXT
        REFERENCES public.travel_license_types(code),
    document_storage_key TEXT,
    ai_confidence NUMERIC(5,4)
        CHECK (
            ai_confidence IS NULL
            OR ai_confidence BETWEEN 0 AND 1
        ),
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            verification_status IN (
                'pending',
                'under_review',
                'approved',
                'rejected',
                'needs_revision'
            )
        ),
    verified_by UUID REFERENCES public.users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT approved_license_requires_verification
        CHECK (
            verification_status <> 'approved'
            OR (
                verified_license_type IS NOT NULL
                AND verified_by IS NOT NULL
                AND verified_at IS NOT NULL
            )
        )
);

CREATE INDEX travel_licenses_organization_idx
ON public.travel_licenses (organization_id, verification_status);

-- Fitur yang boleh diberikan kepada role dalam paket tertentu.
CREATE TABLE public.plan_role_permissions (
    plan_id UUID NOT NULL
        REFERENCES public.subscription_plans(id)
        ON DELETE CASCADE,
    role_id UUID NOT NULL
        REFERENCES public.roles(id)
        ON DELETE CASCADE,
    permission_id UUID NOT NULL
        REFERENCES public.permissions(id)
        ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (plan_id, role_id, permission_id)
);

-- Konfigurasi masa uji coba per paket.
ALTER TABLE public.subscription_plans
ADD COLUMN trial_days INTEGER NOT NULL DEFAULT 0
    CHECK (trial_days BETWEEN 0 AND 365);

-- Catatan perubahan hak akses.
CREATE TABLE public.access_configuration_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.users(id),
    organization_id UUID REFERENCES public.organizations(id),
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.schema_migrations (version)
VALUES ('0009_travel_access_foundation');

COMMIT;