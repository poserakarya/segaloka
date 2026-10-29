-- Segaloka Travel Dashboard session handoff.
-- One-time exchange, independent of Google OAuth.

CREATE TABLE IF NOT EXISTS public.auth_dashboard_handoffs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    dashboard text NOT NULL
        CHECK (dashboard = 'travel'),

    ticket_hash text NOT NULL UNIQUE
        CHECK (ticket_hash ~ '^[0-9a-f]{64}$'),

    binding_hash text NOT NULL
        CHECK (binding_hash ~ '^[0-9a-f]{64}$'),

    session_id uuid NOT NULL
        REFERENCES public.auth_sessions(id)
        ON DELETE CASCADE,

    user_id uuid NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    session_payload_encrypted text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    expires_at timestamptz NOT NULL
        DEFAULT (now() + interval '60 seconds'),

    consumed_at timestamptz,

    CONSTRAINT auth_dashboard_handoffs_expiry_check
        CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS
    idx_auth_dashboard_handoffs_expiry
ON public.auth_dashboard_handoffs (expires_at);

CREATE INDEX IF NOT EXISTS
    idx_auth_dashboard_handoffs_session
ON public.auth_dashboard_handoffs (session_id);

CREATE INDEX IF NOT EXISTS
    idx_auth_dashboard_handoffs_user
ON public.auth_dashboard_handoffs (user_id);

COMMENT ON TABLE public.auth_dashboard_handoffs IS
    'One-time authenticated session handoff for Segaloka dashboards';