BEGIN;

ALTER TABLE public.oauth_states
ADD COLUMN IF NOT EXISTS nonce_hash TEXT;

ALTER TABLE public.oauth_states
ADD CONSTRAINT oauth_states_nonce_hash_format
CHECK (
    nonce_hash IS NULL OR
    nonce_hash ~ '^[0-9a-f]{64}$'
);

INSERT INTO public.schema_migrations (
    version,
    applied_at
)
VALUES (
    '0026_google_oidc_nonce',
    NOW()
)
ON CONFLICT (version) DO NOTHING;

COMMIT;