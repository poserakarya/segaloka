-- Segaloka Test Data Registry
-- Draft: do not apply before review.

BEGIN;

CREATE TABLE public.test_data_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code text NOT NULL UNIQUE,
    description text,
    environment text NOT NULL DEFAULT 'local'
        CHECK (environment IN ('local', 'development')),
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cleaning', 'cleaned')),
    created_at timestamptz NOT NULL DEFAULT now(),
    cleaned_at timestamptz
);

CREATE TABLE public.test_data_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL
        REFERENCES public.test_data_batches(id),
    entity_table text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (batch_id, entity_table, entity_id)
);

CREATE INDEX test_data_records_entity_idx
    ON public.test_data_records(entity_table, entity_id);

COMMIT;