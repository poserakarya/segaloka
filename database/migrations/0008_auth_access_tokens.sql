BEGIN;

CREATE TABLE public.auth_access_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id uuid NOT NULL
        REFERENCES public.auth_sessions(id)
        ON DELETE CASCADE,

    token_hash text NOT NULL UNIQUE,

    expires_at timestamptz NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT auth_access_token_hash_format
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT auth_access_token_expiry_valid
        CHECK (expires_at > created_at)
);

CREATE INDEX auth_access_tokens_session_idx
    ON public.auth_access_tokens(session_id);

CREATE INDEX auth_access_tokens_expiry_idx
    ON public.auth_access_tokens(expires_at);

INSERT INTO public.schema_migrations(version)
VALUES ('0008_auth_access_tokens');

COMMIT;