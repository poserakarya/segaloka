BEGIN;

ALTER TABLE public.users
    ADD COLUMN phone_e164 text,
    ADD COLUMN phone_verified_at timestamptz;

ALTER TABLE public.users
    ADD CONSTRAINT users_phone_e164_format
    CHECK (
        phone_e164 IS NULL
        OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
    );

CREATE UNIQUE INDEX users_phone_e164_unique
    ON public.users (phone_e164)
    WHERE phone_e164 IS NOT NULL;

CREATE TABLE public.auth_login_otp (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    channel text NOT NULL
        CHECK (channel IN ('email', 'whatsapp')),
    destination text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts integer NOT NULL DEFAULT 0
        CHECK (attempts BETWEEN 0 AND 5),
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_sent_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_login_otp_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX auth_login_otp_user_idx
    ON public.auth_login_otp (user_id, created_at DESC);

CREATE INDEX auth_login_otp_expiry_idx
    ON public.auth_login_otp (expires_at);

COMMIT;