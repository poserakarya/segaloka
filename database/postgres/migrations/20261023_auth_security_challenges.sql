BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_security_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,

    session_id uuid NOT NULL
        REFERENCES public.auth_sessions(id) ON DELETE CASCADE,

    purpose text NOT NULL
        CHECK (purpose IN ('enable_2fa', 'disable_2fa')),

    channel text NOT NULL
        CHECK (channel IN ('email', 'whatsapp')),

    destination text NOT NULL,

    code_hash text NOT NULL
        CHECK (code_hash ~ '^[0-9a-f]{64}$'),

    attempts integer NOT NULL DEFAULT 0
        CHECK (attempts >= 0 AND attempts <= 5),

    expires_at timestamptz NOT NULL,

    consumed_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),

    last_sent_at timestamptz NOT NULL DEFAULT now(),

    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS
    idx_auth_security_challenges_user
ON public.auth_security_challenges (
    user_id,
    purpose,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS
    idx_auth_security_challenges_session
ON public.auth_security_challenges (
    session_id,
    expires_at
);

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_auth_security_challenges_pending
ON public.auth_security_challenges (
    user_id,
    purpose
)
WHERE consumed_at IS NULL;

COMMIT;