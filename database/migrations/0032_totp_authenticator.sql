BEGIN;

-- Google Authenticator enrollment.
-- Secret dienkripsi di layer aplikasi menggunakan AES-256-GCM.
-- Tidak menyimpan secret TOTP dalam plaintext.

CREATE TABLE public.auth_totp_authenticators (
    user_id uuid PRIMARY KEY
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    secret_encrypted bytea NOT NULL,
    encryption_iv bytea NOT NULL,
    encryption_tag bytea NOT NULL,

    enabled_at timestamptz,

    last_used_counter bigint,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT auth_totp_secret_not_empty
        CHECK (octet_length(secret_encrypted) > 0),

    CONSTRAINT auth_totp_iv_length
        CHECK (octet_length(encryption_iv) = 12),

    CONSTRAINT auth_totp_tag_length
        CHECK (octet_length(encryption_tag) = 16),

    CONSTRAINT auth_totp_counter_nonnegative
        CHECK (
            last_used_counter IS NULL
            OR last_used_counter >= 0
        )
);

-- Sesi MFA dapat menggunakan Google Authenticator.
-- Constraint konsistensi MFA existing tetap dipertahankan.

ALTER TABLE public.auth_sessions
    DROP CONSTRAINT auth_sessions_mfa_method_check;

ALTER TABLE public.auth_sessions
    ADD CONSTRAINT auth_sessions_mfa_method_check
    CHECK (
        mfa_method IS NULL
        OR mfa_method IN (
            'email',
            'whatsapp',
            'authenticator'
        )
    );

COMMIT;