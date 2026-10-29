-- SEGALOKA 0015
-- Booking, departure, participants, traveler certificates.

CREATE TABLE public.travel_departures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    travel_organization_id UUID NOT NULL
        REFERENCES public.organizations(id),

    title TEXT NOT NULL,
    destination TEXT NOT NULL,

    departure_date DATE NOT NULL,
    return_date DATE,

    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (
            status IN (
                'scheduled',
                'departed',
                'completed',
                'cancelled'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        return_date IS NULL
        OR return_date >= departure_date
    )
);

CREATE INDEX travel_departures_organization_idx
ON public.travel_departures (
    travel_organization_id,
    departure_date
);

CREATE TABLE public.travel_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    departure_id UUID NOT NULL
        REFERENCES public.travel_departures(id),

    booking_user_id UUID NOT NULL
        REFERENCES public.users(id),

    booking_number TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'confirmed',
                'cancelled',
                'completed'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX travel_bookings_departure_idx
ON public.travel_bookings(departure_id);

CREATE INDEX travel_bookings_user_idx
ON public.travel_bookings(booking_user_id);

CREATE TABLE public.travel_booking_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES public.travel_bookings(id),

    user_id UUID REFERENCES public.users(id),

    full_name TEXT NOT NULL,

    departure_status TEXT NOT NULL DEFAULT 'not_verified'
        CHECK (
            departure_status IN (
                'not_verified',
                'departed',
                'not_departed'
            )
        ),

    departure_verified_by UUID REFERENCES public.users(id),
    departure_verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        departure_status <> 'departed'
        OR (
            departure_verified_by IS NOT NULL
            AND departure_verified_at IS NOT NULL
        )
    )
);

CREATE INDEX travel_participants_booking_idx
ON public.travel_booking_participants(booking_id);

CREATE INDEX travel_participants_user_idx
ON public.travel_booking_participants(user_id);

CREATE TABLE public.traveler_travel_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    participant_id UUID NOT NULL UNIQUE
        REFERENCES public.travel_booking_participants(id),

    document_id UUID NOT NULL UNIQUE
        REFERENCES public.documents(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pastikan departure dimiliki Travel, bukan Vendor.
CREATE FUNCTION public.enforce_travel_departure_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.organizations
        WHERE id = NEW.travel_organization_id
          AND organization_type = 'travel'
          AND status = 'active'
    ) THEN
        RAISE EXCEPTION
            'Departure requires an active Travel organization';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_travel_departure_owner_trigger
BEFORE INSERT OR UPDATE
ON public.travel_departures
FOR EACH ROW
EXECUTE FUNCTION public.enforce_travel_departure_owner();

-- Pastikan sertifikat hanya diterbitkan untuk peserta
-- yang telah diverifikasi berangkat.
CREATE FUNCTION public.enforce_traveler_certificate_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_departure_status TEXT;
    v_booking_status TEXT;
    v_document_type TEXT;
    v_document_status TEXT;
    v_document_organization UUID;
    v_travel_organization UUID;
BEGIN
    SELECT
        p.departure_status,
        b.status,
        d.travel_organization_id
    INTO
        v_departure_status,
        v_booking_status,
        v_travel_organization
    FROM public.travel_booking_participants p
    JOIN public.travel_bookings b
      ON b.id = p.booking_id
    JOIN public.travel_departures d
      ON d.id = b.departure_id
    WHERE p.id = NEW.participant_id;

    IF v_departure_status IS DISTINCT FROM 'departed'
       OR v_booking_status NOT IN ('confirmed', 'completed') THEN
        RAISE EXCEPTION
            'Certificate requires a verified departed participant';
    END IF;

    SELECT
        dt.code,
        doc.status,
        doc.organization_id
    INTO
        v_document_type,
        v_document_status,
        v_document_organization
    FROM public.documents doc
    JOIN public.document_types dt
      ON dt.id = doc.document_type_id
    WHERE doc.id = NEW.document_id;

    IF v_document_type IS DISTINCT FROM 'TRAVEL_CERTIFICATE'
       OR v_document_status NOT IN ('issued', 'revised')
       OR v_document_organization IS DISTINCT FROM v_travel_organization
    THEN
        RAISE EXCEPTION
            'Certificate must be an issued Travel document';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_traveler_certificate_rules_trigger
BEFORE INSERT OR UPDATE
ON public.traveler_travel_certificates
FOR EACH ROW
EXECUTE FUNCTION public.enforce_traveler_certificate_rules();