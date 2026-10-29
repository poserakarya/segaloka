-- Segaloka MFA: pre-authentication ticket
-- Candidate only. Not applied to PostgreSQL.

CREATE TABLE public.auth_login_pre_auth (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,

    ticket_hash text NOT NULL UNIQUE,

    expires_at timestamptz NOT NULL,

    consumed_at timestamptz,

    attempts integer NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT auth_login_pre_auth_hash_check
        CHECK (ticket_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT auth_login_pre_auth_attempts_check
        CHECK (attempts BETWEEN 0 AND 5),

    CONSTRAINT auth_login_pre_auth_expiry_check
        CHECK (expires_at > created_at),

    CONSTRAINT auth_login_pre_auth_consumed_check
        CHECK (
            consumed_at IS NULL
            OR consumed_at >= created_at
        )
);

CREATE INDEX auth_login_pre_auth_user_idx
    ON public.auth_login_pre_auth (user_id);

CREATE INDEX auth_login_pre_auth_expiry_idx
    ON public.auth_login_pre_auth (expires_at);

CREATE INDEX auth_login_pre_auth_active_idx
    ON public.auth_login_pre_auth (user_id, expires_at)
    WHERE consumed_at IS NULL;