BEGIN;

CREATE TABLE IF NOT EXISTS public.affiliate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','revision_required','approved','rejected')),
    full_name TEXT NOT NULL,
    nik_encrypted TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    address_encrypted TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number_encrypted TEXT NOT NULL,
    account_name TEXT NOT NULL,
    terms_accepted_at TIMESTAMPTZ NOT NULL,
    account_verified BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID REFERENCES public.users(id),
    review_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS affiliate_applications_status_idx ON public.affiliate_applications(status, created_at DESC);
CREATE TABLE IF NOT EXISTS public.affiliate_application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.affiliate_applications(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('identity','bank_ownership')),
    storage_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (application_id, document_type)
);
INSERT INTO public.schema_migrations(version) VALUES ('0037_affiliate_applications') ON CONFLICT (version) DO NOTHING;
COMMIT;
