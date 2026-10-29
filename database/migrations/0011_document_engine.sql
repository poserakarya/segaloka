BEGIN;

CREATE TABLE public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (code ~ '^[A-Z][A-Z0-9_]{1,31}$')
);

INSERT INTO public.document_types (code, name, category)
VALUES
('MANIFEST', 'Manifest Keberangkatan', 'departure'),
('ROOM_LIST', 'Room List', 'departure'),
('PACKAGE_INFO', 'Paket Info', 'departure'),
('INVOICE', 'Invoice', 'finance'),
('RECEIPT', 'Kuitansi', 'finance'),
('VOUCHER', 'Voucher', 'booking'),
('BANNER', 'Banner Keberangkatan', 'media'),
('OTHER', 'Dokumen Lainnya', 'general');

CREATE TABLE public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID NOT NULL
        REFERENCES public.document_types(id),
    organization_id UUID
        REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),
    layout JSONB NOT NULL DEFAULT '{}'::jsonb,
    field_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(layout) = 'object'),
    CHECK (jsonb_typeof(field_schema) = 'object')
);

CREATE INDEX document_templates_org_type_idx
ON public.document_templates
(organization_id, document_type_id, status);

CREATE UNIQUE INDEX document_templates_version_unique
ON public.document_templates
(
    COALESCE(
        organization_id,
        '00000000-0000-0000-0000-000000000000'::uuid
    ),
    document_type_id,
    name,
    version
);

CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id),
    document_type_id UUID NOT NULL
        REFERENCES public.document_types(id),
    template_id UUID
        REFERENCES public.document_templates(id),
    document_number TEXT NOT NULL UNIQUE,
    verification_token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'issued',
                'revised',
                'void'
            )
        ),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_key TEXT,
    issued_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(data) = 'object'),
    CHECK (
        status NOT IN ('issued', 'revised')
        OR issued_at IS NOT NULL
    )
);

CREATE INDEX documents_org_status_idx
ON public.documents
(organization_id, status, created_at DESC);

CREATE INDEX documents_type_idx
ON public.documents
(document_type_id, created_at DESC);

CREATE TABLE public.document_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL
        REFERENCES public.documents(id),
    revision_number INTEGER NOT NULL
        CHECK (revision_number > 0),
    data_snapshot JSONB NOT NULL,
    storage_key TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, revision_number),
    CHECK (jsonb_typeof(data_snapshot) = 'object')
);

CREATE TABLE public.document_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL
        REFERENCES public.documents(id),
    actor_user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX document_events_document_idx
ON public.document_events
(document_id, created_at DESC);

CREATE TABLE public.banner_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    aspect_ratio TEXT NOT NULL
        CHECK (aspect_ratio IN ('2:1', '1:1')),
    layout JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(layout) = 'object')
);

CREATE INDEX banner_templates_org_idx
ON public.banner_templates
(organization_id, aspect_ratio, is_active);

INSERT INTO public.schema_migrations (version)
VALUES ('0011_document_engine');

COMMIT;