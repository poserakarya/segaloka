-- Segaloka Google OAuth provider configuration
-- Migration 0025
-- Google login disabled by default.

CREATE TABLE IF NOT EXISTS public.oauth_provider_configs (
    provider TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    client_id TEXT,
    client_secret_encrypted TEXT,
    redirect_uri TEXT,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[
        'openid',
        'email',
        'profile'
    ]::TEXT[],
    configured_by UUID,
    configured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT oauth_provider_configs_provider_check
        CHECK (provider IN ('google')),

    CONSTRAINT oauth_provider_configs_enabled_check
        CHECK (
            enabled = FALSE
            OR (
                NULLIF(BTRIM(client_id), '') IS NOT NULL
                AND NULLIF(BTRIM(client_secret_encrypted), '') IS NOT NULL
                AND NULLIF(BTRIM(redirect_uri), '') IS NOT NULL
            )
        )
);

INSERT INTO public.oauth_provider_configs (
    provider,
    enabled
)
VALUES (
    'google',
    FALSE
)
ON CONFLICT (provider) DO NOTHING;

COMMENT ON TABLE public.oauth_provider_configs IS
'Server-side OAuth provider configuration. Secrets must be encrypted by API before persistence.';

COMMENT ON COLUMN public.oauth_provider_configs.client_secret_encrypted IS
'AES-256-GCM encrypted Google Client Secret; never return through public API.';