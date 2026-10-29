BEGIN;

ALTER TABLE public.auth_sessions
    DROP CONSTRAINT IF EXISTS auth_sessions_mfa_method_check;

ALTER TABLE public.auth_sessions
    ADD CONSTRAINT auth_sessions_mfa_method_check
    CHECK (
        mfa_method IS NULL
        OR mfa_method IN (
            'email',
            'whatsapp',
            'authenticator',
            'google'
        )
    );

INSERT INTO public.schema_migrations(version)
VALUES ('0036_google_mfa_method')
ON CONFLICT (version) DO NOTHING;

COMMIT;
