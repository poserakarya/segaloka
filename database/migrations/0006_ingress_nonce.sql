BEGIN;

CREATE TABLE public.ingress_nonces (
    nonce VARCHAR(32) PRIMARY KEY,

    client_ip INET NOT NULL,

    signature_time TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT ingress_nonces_expiry_check
        CHECK (expires_at > signature_time)
);

CREATE INDEX ingress_nonces_expires_at_idx
    ON public.ingress_nonces (expires_at);

INSERT INTO public.schema_migrations (version)
VALUES ('0006_ingress_nonce.sql');

COMMIT;