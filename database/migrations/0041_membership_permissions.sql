-- Izin per membership organisasi Travel (docs/rbac-membership-permissions.md).
-- Idempotent dan non-destruktif: tidak mengubah tabel existing dan tidak
-- mengisi data apa pun (tidak ada izin otomatis untuk membership existing).
BEGIN;

CREATE TABLE IF NOT EXISTS public.membership_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES public.memberships(id),
    permission_id UUID NOT NULL REFERENCES public.permissions(id),
    granted_by UUID NOT NULL REFERENCES public.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_by UUID REFERENCES public.users(id),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT membership_permissions_revocation_pair
        CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);

-- Paling banyak satu izin aktif per membership per permission.
CREATE UNIQUE INDEX IF NOT EXISTS membership_permissions_active_uidx
    ON public.membership_permissions (membership_id, permission_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS membership_permissions_membership_idx
    ON public.membership_permissions (membership_id);

-- Integritas di level database (juga untuk penulisan di luar API):
-- hanya membership role 'travel' pada organisasi bertipe 'travel', hanya
-- lima kode izin, pemberi/pencabut bukan pemilik membership, dan baris
-- tidak berubah selain pencabutan satu kali.
CREATE OR REPLACE FUNCTION public.enforce_membership_permission_rules()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    member_user UUID;
    member_role TEXT;
    org_type TEXT;
    perm_code TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.membership_id <> OLD.membership_id
           OR NEW.permission_id <> OLD.permission_id
           OR NEW.granted_by <> OLD.granted_by
           OR NEW.granted_at <> OLD.granted_at
           OR OLD.revoked_at IS NOT NULL THEN
            RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_IMMUTABLE';
        END IF;
        SELECT m.user_id INTO member_user
          FROM public.memberships m WHERE m.id = NEW.membership_id;
        IF NEW.revoked_by = member_user THEN
            RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_SELF_REVOKE';
        END IF;
        RETURN NEW;
    END IF;

    SELECT m.user_id, r.code, o.organization_type
      INTO member_user, member_role, org_type
      FROM public.memberships m
      JOIN public.roles r ON r.id = m.role_id
      LEFT JOIN public.organizations o ON o.id = m.organization_id
     WHERE m.id = NEW.membership_id;

    SELECT code INTO perm_code FROM public.permissions WHERE id = NEW.permission_id;

    IF member_role IS DISTINCT FROM 'travel' OR org_type IS DISTINCT FROM 'travel' THEN
        RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_TRAVEL_ONLY';
    END IF;
    IF perm_code IS NULL OR perm_code NOT IN (
        'travel.certificates.issue', 'travel.certificates.revoke',
        'travel.partners.read', 'travel.partners.manage', 'travel.partners.approve'
    ) THEN
        RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_CODE_NOT_ALLOWED';
    END IF;
    IF NEW.granted_by = member_user THEN
        RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_SELF_GRANT';
    END IF;
    IF NEW.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_INSERT_ACTIVE_ONLY';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_membership_permission_rules_trigger
    ON public.membership_permissions;
CREATE TRIGGER enforce_membership_permission_rules_trigger
    BEFORE INSERT OR UPDATE ON public.membership_permissions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_membership_permission_rules();

-- Riwayat izin tidak boleh dihapus: pencabutan memakai revoked_at.
CREATE OR REPLACE FUNCTION public.prevent_membership_permission_removal()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_HISTORY_IS_APPEND_ONLY';
END;
$$;

DROP TRIGGER IF EXISTS prevent_membership_permission_delete_trigger
    ON public.membership_permissions;
CREATE TRIGGER prevent_membership_permission_delete_trigger
    BEFORE DELETE ON public.membership_permissions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_permission_removal();

DROP TRIGGER IF EXISTS prevent_membership_permission_truncate_trigger
    ON public.membership_permissions;
CREATE TRIGGER prevent_membership_permission_truncate_trigger
    BEFORE TRUNCATE ON public.membership_permissions
    FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_membership_permission_removal();

-- Hak akses: tidak ada akses umum; pemilik tabel (akun aplikasi) tidak
-- memiliki DELETE/TRUNCATE. Bila production memakai akun aplikasi terpisah
-- dari pemilik skema, beri hanya SELECT, INSERT, dan UPDATE (lihat dokumen).
REVOKE ALL ON TABLE public.membership_permissions FROM PUBLIC;
REVOKE DELETE, TRUNCATE ON TABLE public.membership_permissions FROM CURRENT_USER;

INSERT INTO public.schema_migrations (version)
VALUES ('0041_membership_permissions')
ON CONFLICT (version) DO NOTHING;

COMMIT;
