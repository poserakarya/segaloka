BEGIN;

CREATE TABLE public.affiliate_referral_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_user_id UUID NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    travel_organization_id UUID NOT NULL
        REFERENCES public.organizations(id) ON DELETE RESTRICT,
    referral_code TEXT NOT NULL UNIQUE
        CHECK (referral_code ~ '^[0-9a-f]{24}$'),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (affiliate_user_id, travel_organization_id)
);

CREATE INDEX affiliate_referral_links_owner_idx
ON public.affiliate_referral_links (affiliate_user_id, created_at DESC);

CREATE INDEX affiliate_referral_links_travel_idx
ON public.affiliate_referral_links (travel_organization_id, status);

INSERT INTO public.permissions (code)
VALUES
    ('affiliate.referral_links.read'),
    ('affiliate.referral_links.manage')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'affiliate'
  AND p.code IN (
      'affiliate.referral_links.read',
      'affiliate.referral_links.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.schema_migrations (version)
VALUES ('0022_affiliate_referral_links')
ON CONFLICT (version) DO NOTHING;

COMMIT;
