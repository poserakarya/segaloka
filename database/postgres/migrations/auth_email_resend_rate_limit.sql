BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_email_resend_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip_hash text NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now(),
    outcome text NOT NULL DEFAULT 'reserved',

    CONSTRAINT auth_email_resend_ip_hash_check
        CHECK (ip_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT auth_email_resend_outcome_check
        CHECK (outcome IN ('reserved', 'blocked'))
);

CREATE INDEX IF NOT EXISTS auth_email_resend_ip_time_idx
    ON public.auth_email_resend_attempts (
        ip_hash,
        attempted_at DESC
    );

COMMIT;