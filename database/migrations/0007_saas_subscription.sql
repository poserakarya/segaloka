BEGIN;

CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    price_amount NUMERIC(18,2) NOT NULL DEFAULT 0
        CHECK (price_amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'IDR',
    billing_interval TEXT NOT NULL
        CHECK (billing_interval IN ('monthly','yearly')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id),
    plan_id UUID NOT NULL
        REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'trialing',
            'active',
            'past_due',
            'suspended',
            'canceled',
            'expired'
        )),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscription_period_check
        CHECK (
            current_period_start IS NULL
            OR current_period_end IS NULL
            OR current_period_end > current_period_start
        )
);

CREATE INDEX organization_subscriptions_org_idx
ON public.organization_subscriptions
(organization_id, status);

CREATE TABLE public.entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.plan_entitlements (
    plan_id UUID NOT NULL
        REFERENCES public.subscription_plans(id)
        ON DELETE CASCADE,
    entitlement_id UUID NOT NULL
        REFERENCES public.entitlements(id)
        ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    limit_value INTEGER CHECK (limit_value IS NULL OR limit_value >= 0),
    PRIMARY KEY (plan_id, entitlement_id)
);

CREATE TABLE public.organization_entitlement_overrides (
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    entitlement_id UUID NOT NULL
        REFERENCES public.entitlements(id)
        ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL,
    limit_value INTEGER CHECK (limit_value IS NULL OR limit_value >= 0),
    reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, entitlement_id)
);

INSERT INTO public.entitlements (code, description)
VALUES
('dashboard.access', 'Akses dashboard Travel'),
('website.access', 'Akses website Travel'),
('packages.manage', 'Pengelolaan paket'),
('bookings.manage', 'Pengelolaan booking'),
('branches.manage', 'Pengelolaan cabang'),
('crm.access', 'Akses CRM'),
('omnichannel.access', 'Akses omnichannel'),
('ads.manage', 'Pengelolaan iklan')
ON CONFLICT (code) DO NOTHING;

-- Subscription hanya untuk organisasi Travel.
CREATE OR REPLACE FUNCTION public.enforce_travel_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    org_type text;
BEGIN
    SELECT organization_type
      INTO org_type
      FROM public.organizations
     WHERE id = NEW.organization_id
     FOR UPDATE;

    IF org_type IS DISTINCT FROM 'travel' THEN
        RAISE EXCEPTION
            'Subscription hanya diperbolehkan untuk organisasi Travel';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER subscription_travel_only_trigger
BEFORE INSERT OR UPDATE OF organization_id
ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_travel_subscription();

-- Cegah lebih dari satu subscription berjalan per Travel.
CREATE UNIQUE INDEX organization_one_running_subscription_idx
ON public.organization_subscriptions (organization_id)
WHERE status IN (
    'pending',
    'trialing',
    'active',
    'past_due',
    'suspended'
);

-- Status aktif harus memiliki periode berlaku.
ALTER TABLE public.organization_subscriptions
ADD CONSTRAINT active_subscription_requires_period
CHECK (
    status NOT IN ('active', 'trialing')
    OR (
        current_period_start IS NOT NULL
        AND current_period_end IS NOT NULL
        AND current_period_end > current_period_start
    )
);
-- Organisasi yang mempunyai subscription tidak boleh berubah menjadi Vendor.
CREATE OR REPLACE FUNCTION public.protect_subscription_organization_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.organization_type = 'travel'
       AND NEW.organization_type <> 'travel'
       AND EXISTS (
           SELECT 1
           FROM public.organization_subscriptions
           WHERE organization_id = OLD.id
       )
    THEN
        RAISE EXCEPTION
            'Organisasi dengan riwayat subscription tidak boleh diubah menjadi Vendor';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_subscription_organization_type_trigger
BEFORE UPDATE OF organization_type
ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.protect_subscription_organization_type();
INSERT INTO public.schema_migrations(version)
VALUES ('0007_saas_subscription');

COMMIT;