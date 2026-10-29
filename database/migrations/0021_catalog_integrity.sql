-- Segaloka Catalog Integrity
-- Requires 0019_travel_catalog.sql
-- Draft: review before applying.

BEGIN;

-- One departure may belong to only one catalog package.
CREATE UNIQUE INDEX
    travel_package_departures_one_package_per_departure
ON public.travel_package_departures(departure_id);

-- Prevent linking a package to a departure owned by another Travel.
CREATE FUNCTION public.validate_package_departure_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    package_owner uuid;
    departure_owner uuid;
BEGIN
    SELECT travel_organization_id
    INTO package_owner
    FROM public.travel_packages
    WHERE id = NEW.package_id;

    SELECT travel_organization_id
    INTO departure_owner
    FROM public.travel_departures
    WHERE id = NEW.departure_id;

    IF package_owner IS NULL
       OR departure_owner IS NULL
       OR package_owner <> departure_owner THEN
        RAISE EXCEPTION
            'PACKAGE_DEPARTURE_OWNER_MISMATCH';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER
    validate_package_departure_owner_trigger
BEFORE INSERT OR UPDATE
ON public.travel_package_departures
FOR EACH ROW
EXECUTE FUNCTION public.validate_package_departure_owner();

COMMIT;