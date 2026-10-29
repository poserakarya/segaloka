BEGIN;

CREATE TABLE IF NOT EXISTS public.password_reset_otp_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,

    otp_hash text NOT NULL,

    expires_at timestamptz NOT NULL,

    verified_at timestamptz,

    consumed_at timestamptz,

    attempts integer NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT password_reset_otp_hash_check
        CHECK (otp_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT password_reset_otp_attempts_check
        CHECK (attempts >= 0 AND attempts <= 5)
);

CREATE INDEX IF NOT EXISTS password_reset_otp_user_idx
    ON public.password_reset_otp_challenges(user_id);

CREATE INDEX IF NOT EXISTS password_reset_otp_expiry_idx
    ON public.password_reset_otp_challenges(expires_at);

COMMIT;