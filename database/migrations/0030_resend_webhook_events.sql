BEGIN;

CREATE TABLE IF NOT EXISTS public.resend_webhook_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id text NOT NULL UNIQUE,
    email_id text,
    event_type text NOT NULL,
    event_created_at timestamptz,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    processing_status text NOT NULL DEFAULT 'processed'
        CHECK (processing_status IN ('processed', 'duplicate', 'failed')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT resend_webhook_events_event_id_check
        CHECK (length(event_id) BETWEEN 1 AND 256),
    CONSTRAINT resend_webhook_events_email_id_check
        CHECK (email_id IS NULL OR length(email_id) BETWEEN 1 AND 256)
);

CREATE INDEX IF NOT EXISTS resend_webhook_events_email_idx
    ON public.resend_webhook_events(email_id, received_at DESC);

CREATE INDEX IF NOT EXISTS resend_webhook_events_type_idx
    ON public.resend_webhook_events(event_type, received_at DESC);

CREATE TABLE IF NOT EXISTS public.resend_email_statuses (
    email_id text PRIMARY KEY,
    status text NOT NULL CHECK (status IN (
        'email.sent',
        'email.delivered',
        'email.delivery_delayed',
        'email.bounced',
        'email.failed',
        'email.complained'
    )),
    event_created_at timestamptz,
    last_event_id text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version varchar(100) PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.schema_migrations(version)
VALUES ('0030_resend_webhook_events')
ON CONFLICT (version) DO NOTHING;

COMMIT;
