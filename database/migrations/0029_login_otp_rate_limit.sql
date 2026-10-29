BEGIN;

CREATE TABLE public.auth_login_otp_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    ip_hash text NOT NULL,

    outcome text NOT NULL,

    attempted_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT auth_login_otp_attempts_ip_hash_check
        CHECK (ip_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT auth_login_otp_attempts_outcome_check
        CHECK (outcome IN ('reserved', 'failure', 'success', 'blocked'))
);

CREATE INDEX auth_login_otp_attempts_ip_time_idx
    ON public.auth_login_otp_attempts (
        ip_hash,
        attempted_at DESC
    );

INSERT INTO public.schema_migrations(version)
VALUES ('0029_login_otp_rate_limit');

COMMIT;