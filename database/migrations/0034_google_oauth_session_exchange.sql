CREATE TABLE public.auth_oauth_exchanges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    provider text NOT NULL
        CHECK (provider = 'google'),

    exchange_code_hash text NOT NULL UNIQUE
        CHECK (exchange_code_hash ~ '^[0-9a-f]{64}$'),

    browser_binding_hash text NOT NULL
        CHECK (browser_binding_hash ~ '^[0-9a-f]{64}$'),

    session_id uuid NOT NULL
        REFERENCES public.auth_sessions(id)
        ON DELETE CASCADE,

    session_payload_encrypted text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    expires_at timestamptz NOT NULL
        DEFAULT (now() + interval '60 seconds'),

    consumed_at timestamptz,

    CONSTRAINT auth_oauth_exchange_expiry_check
        CHECK (expires_at > created_at)
);

CREATE INDEX idx_auth_oauth_exchanges_expiry
ON public.auth_oauth_exchanges (expires_at);

CREATE INDEX idx_auth_oauth_exchanges_session
ON public.auth_oauth_exchanges (session_id);