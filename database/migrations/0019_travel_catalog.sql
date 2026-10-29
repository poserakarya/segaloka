-- Segaloka Travel Catalog
-- Draft: review before database application.

BEGIN;

CREATE TABLE public.travel_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_organization_id uuid NOT NULL
        REFERENCES public.organizations(id),
    title text NOT NULL,
    description text,
    category text NOT NULL,
    destination text NOT NULL,
    publication_status text NOT NULL DEFAULT 'draft'
        CHECK (publication_status IN (
            'draft',
            'published',
            'unpublished',
            'archived'
        )),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX travel_packages_organization_idx
    ON public.travel_packages(travel_organization_id);

CREATE INDEX travel_packages_publication_idx
    ON public.travel_packages(publication_status);

CREATE TABLE public.travel_package_departures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id uuid NOT NULL
        REFERENCES public.travel_packages(id),
    departure_id uuid NOT NULL
        REFERENCES public.travel_departures(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (package_id, departure_id)
);

CREATE INDEX travel_package_departures_departure_idx
    ON public.travel_package_departures(departure_id);

COMMIT;