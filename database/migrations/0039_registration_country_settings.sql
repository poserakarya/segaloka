BEGIN;
CREATE TABLE IF NOT EXISTS public.registration_country_settings (
 country_id UUID PRIMARY KEY REFERENCES public.master_countries(id),
 allow_travel BOOLEAN NOT NULL DEFAULT false,
 allow_vendor BOOLEAN NOT NULL DEFAULT false,
 updated_by UUID REFERENCES public.users(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.registration_country_settings(country_id,allow_travel,allow_vendor)
SELECT id, iso2='ID', iso2='ID' FROM public.master_countries
ON CONFLICT (country_id) DO NOTHING;
INSERT INTO public.schema_migrations(version) VALUES ('0039_registration_country_settings') ON CONFLICT (version) DO NOTHING;
COMMIT;
