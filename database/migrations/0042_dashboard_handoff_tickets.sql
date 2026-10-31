-- Tiket handoff login Marketplace -> enam dashboard non-admin.
-- Tiket sekali pakai (hanya hash yang disimpan), kedaluwarsa singkat, terikat
-- ke dashboard, user, organisasi (Travel/Vendor), sesi Marketplace sumber, dan
-- challenge = sha256(verifier) yang hanya diketahui BFF dashboard melalui
-- cookie HttpOnly miliknya. Idempotent dan non-destruktif; tidak mengubah
-- tabel existing (auth_dashboard_handoffs dari 0040 tetap ada).
BEGIN;

CREATE TABLE IF NOT EXISTS public.dashboard_handoff_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard TEXT NOT NULL
        CHECK (dashboard IN ('travel', 'vendor', 'affiliate', 'agen', 'mitra', 'traveler')),
    ticket_hash TEXT NOT NULL UNIQUE
        CHECK (ticket_hash ~ '^[0-9a-f]{64}$'),
    challenge TEXT NOT NULL
        CHECK (challenge ~ '^[0-9a-f]{64}$'),
    source_session_id UUID NOT NULL REFERENCES public.auth_sessions(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 seconds'),
    consumed_at TIMESTAMPTZ,
    CONSTRAINT dashboard_handoff_tickets_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT dashboard_handoff_tickets_tenant_check CHECK (
        (dashboard IN ('travel', 'vendor')) = (organization_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS dashboard_handoff_tickets_expiry_idx
    ON public.dashboard_handoff_tickets (expires_at);

CREATE INDEX IF NOT EXISTS dashboard_handoff_tickets_user_idx
    ON public.dashboard_handoff_tickets (user_id);

REVOKE ALL ON TABLE public.dashboard_handoff_tickets FROM PUBLIC;

INSERT INTO public.schema_migrations (version)
VALUES ('0042_dashboard_handoff_tickets')
ON CONFLICT (version) DO NOTHING;

COMMIT;
