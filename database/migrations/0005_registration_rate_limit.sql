-- Segaloka: registration rate limiting
-- Migration 0005
-- Do not store raw IP addresses.

CREATE TABLE IF NOT EXISTS public.auth_registration_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    email_normalized text,

    ip_hash text NOT NULL,

    outcome text NOT NULL,

    attempted_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT auth_registration_attempts_ip_hash_check
        CHECK (ip_hash ~ '^[a-f0-9]{64}$'),

    CONSTRAINT auth_registration_attempts_outcome_check
        CHECK (outcome IN ('success', 'duplicate', 'blocked', 'failure'))
);

CREATE INDEX IF NOT EXISTS auth_registration_attempts_ip_time_idx
    ON public.auth_registration_attempts
    (ip_hash, attempted_at DESC);

CREATE INDEX IF NOT EXISTS auth_registration_attempts_email_time_idx
    ON public.auth_registration_attempts
    (email_normalized, attempted_at DESC);