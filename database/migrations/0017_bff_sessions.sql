-- Segaloka BFF persistent sessions
-- Independent from public.auth_sessions

CREATE TABLE IF NOT EXISTS public.bff_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    session_hash text NOT NULL UNIQUE,

    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,

    encrypted_tokens text NOT NULL,

    expires_at timestamptz NOT NULL,

    revoked_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),

    last_used_at timestamptz,

    CONSTRAINT bff_sessions_hash_check
        CHECK (session_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT bff_sessions_expiry_check
        CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS bff_sessions_user_idx
    ON public.bff_sessions(user_id);

CREATE INDEX IF NOT EXISTS bff_sessions_active_expiry_idx
    ON public.bff_sessions(expires_at)
    WHERE revoked_at IS NULL;

COMMENT ON TABLE public.bff_sessions IS
    'Persistent encrypted BFF sessions for Segaloka server-side applications';