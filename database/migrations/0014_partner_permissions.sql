INSERT INTO public.permissions (code)
VALUES
    ('travel.partners.read'),
    ('travel.partners.manage'),
    ('travel.partners.approve'),
    ('travel.certificates.issue'),
    ('travel.certificates.revoke')
ON CONFLICT (code) DO NOTHING;