BEGIN;

CREATE TABLE public.user_identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    provider text NOT NULL
        CHECK (provider IN ('google')),

    provider_subject text NOT NULL,

    provider_email text,

    provider_email_verified boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now(),

    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT user_identities_provider_subject_unique
        UNIQUE (provider, provider_subject),

    CONSTRAINT user_identities_user_provider_unique
        UNIQUE (user_id, provider)
);

CREATE INDEX user_identities_user_id_idx
    ON public.user_identities(user_id);

CREATE TABLE public.oauth_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    provider text NOT NULL
        CHECK (provider IN ('google')),

    state_hash text NOT NULL UNIQUE
        CHECK (state_hash ~ '^[0-9a-f]{64}$'),

    code_verifier_encrypted text NOT NULL,

    redirect_uri text NOT NULL,

    expires_at timestamptz NOT NULL,

    consumed_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX oauth_states_expires_at_idx
    ON public.oauth_states(expires_at);

INSERT INTO public.schema_migrations (
    version,
    applied_at
)
VALUES (
    '0003_external_identities',
    now()
);

COMMIT;