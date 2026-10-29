BEGIN;

ALTER TABLE public.auth_totp_authenticators
    ADD COLUMN enrollment_expires_at timestamptz,
    ADD COLUMN enrollment_attempts integer NOT NULL DEFAULT 0,
    ADD COLUMN enrollment_session_id uuid
        REFERENCES public.auth_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.auth_totp_authenticators
    ADD CONSTRAINT auth_totp_enrollment_attempts_check
    CHECK (enrollment_attempts BETWEEN 0 AND 5);

ALTER TABLE public.auth_totp_authenticators
    ADD CONSTRAINT auth_totp_enrollment_state_check
    CHECK (
        (
            enabled_at IS NULL
            AND enrollment_expires_at IS NOT NULL
            AND enrollment_session_id IS NOT NULL
        )
        OR
        (
            enabled_at IS NOT NULL
            AND enrollment_expires_at IS NULL
            AND enrollment_session_id IS NULL
        )
    );

COMMIT;