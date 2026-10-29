BEGIN;

CREATE TABLE public.master_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iso2 CHAR(2) NOT NULL UNIQUE,
    iso3 CHAR(3) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.master_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL
        REFERENCES public.master_countries(id),
    code TEXT,
    name TEXT NOT NULL,
    region_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (country_id, code)
);

CREATE TABLE public.master_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL
        REFERENCES public.master_countries(id),
    region_id UUID
        REFERENCES public.master_regions(id),
    name TEXT NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    timezone TEXT,
    external_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX master_cities_country_name_idx
ON public.master_cities (country_id, name);

CREATE INDEX master_cities_region_idx
ON public.master_cities (region_id);

CREATE TABLE public.master_airports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata_code CHAR(3),
    icao_code CHAR(4),
    name TEXT NOT NULL,
    city_id UUID REFERENCES public.master_cities(id),
    country_id UUID NOT NULL
        REFERENCES public.master_countries(id),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    timezone TEXT,
    airport_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (longitude BETWEEN -180 AND 180)
);

CREATE UNIQUE INDEX master_airports_iata_unique
ON public.master_airports (iata_code)
WHERE iata_code IS NOT NULL;

CREATE UNIQUE INDEX master_airports_icao_unique
ON public.master_airports (icao_code)
WHERE icao_code IS NOT NULL;

CREATE INDEX master_airports_country_idx
ON public.master_airports (country_id);

CREATE TABLE public.master_airlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata_code VARCHAR(3),
    icao_code CHAR(3),
    name TEXT NOT NULL,
    country_id UUID REFERENCES public.master_countries(id),
    callsign TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX master_airlines_name_idx
ON public.master_airlines (name);

CREATE INDEX master_airlines_iata_idx
ON public.master_airlines (iata_code);

CREATE TABLE public.master_currencies (
    code CHAR(3) PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    decimal_digits INTEGER NOT NULL DEFAULT 2
        CHECK (decimal_digits BETWEEN 0 AND 4),
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.master_languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT,
    direction TEXT NOT NULL DEFAULT 'ltr'
        CHECK (direction IN ('ltr', 'rtl')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.master_timezones (
    name TEXT PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.schema_migrations (version)
VALUES ('0010_global_master_data');

COMMIT;