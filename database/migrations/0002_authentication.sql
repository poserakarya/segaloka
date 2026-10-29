BEGIN;

CREATE TABLE public.user_credentials (
    user_id uuid PRIMARY KEY
        REFERENCES public.users(id) ON DELETE CASCADE,
    password_hash text NOT NULL,
    password_changed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_credentials_hash_format_check
        CHECK (password_hash LIKE '$argon2id$%')
);

CREATE TABLE public.email_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT email_verifications_token_hash_check
        CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX email_verifications_user_idx
    ON public.email_verifications(user_id);

CREATE TABLE public.auth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    CONSTRAINT auth_sessions_refresh_hash_check
        CHECK (refresh_token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX auth_sessions_user_idx
    ON public.auth_sessions(user_id);

CREATE INDEX auth_sessions_active_expiry_idx
    ON public.auth_sessions(expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE public.password_reset_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT password_reset_token_hash_check
        CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX password_reset_user_idx
    ON public.password_reset_requests(user_id);

CREATE TABLE public.auth_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email_normalized text,
    ip_hash text,
    outcome text NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_attempts_outcome_check
        CHECK (outcome IN ('success', 'failure', 'blocked')),
    CONSTRAINT auth_attempts_ip_hash_check
        CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX auth_attempts_email_time_idx
    ON public.auth_attempts(email_normalized, attempted_at DESC);

CREATE INDEX auth_attempts_ip_time_idx
    ON public.auth_attempts(ip_hash, attempted_at DESC);

ALTER TABLE public.users
    ADD COLUMN email_verified_at timestamptz;

INSERT INTO public.schema_migrations(version)
VALUES ('0002_authentication');

COMMIT;