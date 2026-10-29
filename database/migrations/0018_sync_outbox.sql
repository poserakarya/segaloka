BEGIN;

CREATE TABLE IF NOT EXISTS public.sync_outbox (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id),
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT sync_outbox_event_type_check
        CHECK (length(event_type) BETWEEN 3 AND 120),

    CONSTRAINT sync_outbox_entity_type_check
        CHECK (length(entity_type) BETWEEN 2 AND 120)
);

CREATE INDEX IF NOT EXISTS sync_outbox_org_cursor_idx
ON public.sync_outbox (organization_id, id);

CREATE INDEX IF NOT EXISTS sync_outbox_created_idx
ON public.sync_outbox (created_at);

INSERT INTO public.schema_migrations (version)
VALUES ('0018_sync_outbox')
ON CONFLICT (version) DO NOTHING;

COMMIT;