BEGIN;

ALTER TABLE public.auth_sessions
    ADD COLUMN mfa_verified_at TIMESTAMPTZ,
    ADD COLUMN mfa_method TEXT;

ALTER TABLE public.auth_sessions
    ADD CONSTRAINT auth_sessions_mfa_method_check
    CHECK (
        mfa_method IS NULL
        OR mfa_method IN ('email', 'whatsapp')
    );

ALTER TABLE public.auth_sessions
    ADD CONSTRAINT auth_sessions_mfa_consistency_check
    CHECK (
        (
            mfa_verified_at IS NULL
            AND mfa_method IS NULL
        )
        OR
        (
            mfa_verified_at IS NOT NULL
            AND mfa_method IS NOT NULL
        )
    );

COMMIT;