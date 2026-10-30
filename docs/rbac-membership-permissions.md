# Rancangan RBAC: izin per membership organisasi Travel

Status: **rancangan untuk ditinjau.** Belum ada migrasi, kode, atau data yang dibuat. Tidak diterapkan ke database mana pun sebelum disetujui.

## 1. Kondisi existing (hasil audit)

| Objek | Struktur | Catatan |
|---|---|---|
| `roles` | `id, code (unik), name` | 7 role global: `affiliate, agen, mitra, super_admin, travel, traveler, vendor` |
| `memberships` | `id, user_id, organization_id (nullable), role_id, created_at`; unik `(user_id, organization_id, role_id)` | Satu baris per user per organisasi per role. Staf Travel = role `travel` + `organization_id` Travel. |
| `permissions` | `id, code (unik)` | Termasuk `travel.certificates.issue/revoke` dan `travel.partners.read/manage/approve` (migrasi 0014) |
| `role_permissions` | `(role_id, permission_id)` | Hanya izin `affiliate.*` yang terisi. Tidak ada izin `travel.*` untuk role mana pun. |
| `plan_role_permissions` | `(plan_id, role_id, permission_id, enabled)` | Ada di skema, tidak dipakai kode API. |
| `audit_logs` | `id, actor_user_id, organization_id, action, entity_type, entity_id, created_at` | Tanpa kolom metadata. |

Asal membership Travel: dibuat sekali saat Super Admin menyetujui pendaftaran Travel (`PATCH /admin/registration-applications/:id`). Pemohon menjadi satu-satunya anggota. Belum ada endpoint pengelolaan tim Travel.

Pemakaian izin di kode:
- `POST /travel/participants/:id/certificate` → role `travel` di organisasi peserta **dan** role memegang `travel.certificates.issue` (via `role_permissions`).
- Pencabutan sertifikat → idem dengan `travel.certificates.revoke`.
- `travel.partners.*` belum dipakai endpoint mana pun. Relasi mitra/agen (`travel_partner_relationships`) belum memiliki endpoint tulis.

Akibatnya saat ini tidak ada staf Travel yang bisa menerbitkan atau mencabut sertifikat (tes `certificate-encrypted-e2e` gagal dengan 403).

## 2. Prinsip
- Role utama `travel` tetap. Tidak ada role global baru. `role_permissions` tidak diubah.
- Izin sertifikat dan mitra melekat pada **satu membership** (= satu user di satu organisasi Travel). Izin di organisasi A tidak berlaku di organisasi B, karena membership B adalah baris lain.
- Least privilege: membership baru dan existing **tidak** mendapat izin apa pun secara otomatis.
- Pemberian dan pencabutan hanya oleh Super Admin lewat Control Center. Tidak ada self-grant, dan pemberi tidak bisa memberi izin kepada dirinya sendiri walaupun ia juga anggota Travel.
- Pencabutan tidak menghapus baris (riwayat tetap ada untuk audit).

## 3. Skema (migrasi baru `0041_membership_permissions.sql`)

```sql
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

-- Integritas di level database (berlaku juga untuk penulisan di luar API):
-- hanya membership role 'travel' pada organisasi bertipe 'travel', hanya
-- kode izin yang diizinkan, pemberi bukan pemilik membership, dan baris
-- tidak boleh diubah selain pencabutan satu kali.
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
    IF perm_code NOT IN ('travel.certificates.issue', 'travel.certificates.revoke',
                         'travel.partners.read', 'travel.partners.manage',
                         'travel.partners.approve') THEN
        RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_CODE_NOT_ALLOWED';
    END IF;
    IF NEW.granted_by = member_user THEN
        RAISE EXCEPTION 'MEMBERSHIP_PERMISSION_SELF_GRANT';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_membership_permission_rules_trigger
    ON public.membership_permissions;
CREATE TRIGGER enforce_membership_permission_rules_trigger
    BEFORE INSERT OR UPDATE ON public.membership_permissions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_membership_permission_rules();

INSERT INTO public.schema_migrations (version)
VALUES ('0041_membership_permissions')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

Sifat migrasi:
- **Idempotent:** `IF NOT EXISTS`, `CREATE OR REPLACE`, dan trigger dibuat ulang. Runner `database/migrate.mjs` juga mencatat versinya.
- **Non-destruktif:** tidak ada `DROP TABLE/COLUMN`, `DELETE`, atau `TRUNCATE`, dan tidak ada data yang diubah atau diisi. `DROP TRIGGER IF EXISTS` hanya untuk trigger milik tabel baru ini.
- **Kompatibel:** tidak ada kolom yang diubah di tabel existing. FK ke `memberships` tanpa `ON DELETE CASCADE`, sehingga membership yang punya riwayat izin tidak bisa terhapus diam-diam. Saat ini tidak ada kode yang menghapus membership.

## 4. Pemeriksaan akses (API)
Satu helper `src/security/membership-permission.js` dipakai semua pemeriksaan:

```sql
SELECT 1
FROM public.memberships m
JOIN public.roles r ON r.id = m.role_id AND r.code = 'travel'
JOIN public.organizations o ON o.id = m.organization_id
     AND o.organization_type = 'travel' AND o.status = 'active'
JOIN public.membership_permissions mp ON mp.membership_id = m.id AND mp.revoked_at IS NULL
JOIN public.permissions p ON p.id = mp.permission_id AND p.code = $3
WHERE m.user_id = $1
  AND m.organization_id = $2      -- organisasi yang sedang diakses
LIMIT 1
```

- `organization_id` diambil dari data yang diakses di server (organisasi pemilik keberangkatan peserta atau sertifikat), **bukan** dari input klien.
- Sertifikat: `certificate-routes.js` (issue) dan `certificate-revoke-routes.js` (revoke) mengganti join `role_permissions` dengan helper ini. Untuk lima kode `travel.*`, `role_permissions` tidak lagi dipakai (least privilege).
- `travel.partners.*`: helper yang sama untuk endpoint mitra/agen yang dibuat nanti. Rancangan ini tidak membuat endpoint mitra baru.

## 5. Pemberian dan pencabutan (Control Center, Super Admin)

| Endpoint (API) | Fungsi |
|---|---|
| `GET /control-center/travels/:organizationId/members` | Daftar membership `travel` di organisasi itu beserta izin aktif |
| `PUT /control-center/travels/:organizationId/members/:membershipId/permissions/:code` | Beri izin (idempotent: bila sudah aktif → 200 tanpa duplikat) |
| `DELETE /control-center/travels/:organizationId/members/:membershipId/permissions/:code` | Cabut izin: `revoked_at/revoked_by` diisi, baris tetap ada |

Aturan:
- Hanya `super_admin` global, lewat BFF Control Center yang sudah mewajibkan sesi super_admin. Sesi akun ber-2FA wajib MFA terverifikasi (`session-auth`).
- `membershipId` wajib milik `organizationId` di path, ber-role `travel`. Kode izin wajib salah satu dari lima kode.
- Aktor tidak boleh pemilik membership target (juga ditegakkan trigger).
- Setiap perubahan menulis `audit_logs` dalam transaksi yang sama (`action`: `travel.membership_permission.granted` / `.revoked`, `entity_type`: `membership_permission`, `entity_id`: id baris izin, `organization_id`: organisasi Travel). Kode izin dapat ditelusuri dari `entity_id`.
- Event outbox `travel_membership_permission` dalam transaksi yang sama, agar halaman Control Center yang terbuka dapat memuat ulang.
- Tidak ada endpoint di dashboard Travel untuk mengubah izin, sehingga staf Travel tidak bisa memberi izin ke dirinya sendiri atau ke rekan.

UI: desain V7 Control Center tidak diubah. Penyambungan ke UI (misalnya tab tim pada detail Travel yang sudah ada di V7) diusulkan terpisah setelah API disetujui. Sampai saat itu, aksi V7 terkait tetap diblokir.

## 6. Analisis kompatibilitas

| Area | Dampak |
|---|---|
| Penerbitan/pencabutan sertifikat | Saat ini 403 untuk semua. Setelah perubahan, 403 kecuali membership diberi izin, jadi tidak ada regresi bagi pengguna. |
| Database production | Wajib cek sebelum deploy apakah ada grant manual role-level untuk `travel.*` (kueri di §7). Bila ada, grant itu tidak lagi berlaku. Super Admin memberi ulang per membership secara eksplisit; tidak dikonversi otomatis. |
| Affiliate (`role_permissions`) | Tidak berubah. |
| Login, sesi, 2FA, dashboard access | Tidak berubah. |
| Pendaftaran Travel/Vendor/Affiliate | Tidak berubah: tanpa syarat verifikasi email sebelum pengajuan. Dokumen legalitas dan approval Super Admin existing tetap. Membership hasil approval tidak mendapat izin otomatis. |
| SSE / outbox | Menambah satu `entity_type`. Stream Control Center menyertakannya; stream lain tidak. |

## 7. Rencana migrasi
1. Tinjau dan setujui rancangan ini.
2. Implementasi di `e2e-02`: migrasi 0041, helper, perubahan dua route sertifikat, endpoint Control Center + proxy BFF, tes. Uji pada PostgreSQL `_test`.
3. Sebelum production, jalankan kueri read-only:
   ```sql
   SELECT r.code, p.code FROM public.role_permissions rp
   JOIN public.roles r ON r.id = rp.role_id
   JOIN public.permissions p ON p.id = rp.permission_id
   WHERE p.code LIKE 'travel.%';
   ```
   lalu `node database/migrate.mjs status`.
4. Backup (`deploy/cloud/backup-postgres.sh`), uji di salinan staging, lalu `apply --confirm-database <nama>`. Ini dilakukan hanya dengan persetujuan terpisah.
5. Rollback: hentikan pemakaian endpoint (deploy versi sebelumnya). Tabel baru boleh tetap ada karena tidak dibaca versi lama. Tidak ada rollback destruktif otomatis.

## 8. Rencana tes (PostgreSQL `_test`, API asli)
- **Akses sah:** staf Travel A dengan izin `issue` di A menerbitkan sertifikat peserta A (201) dan audit tercatat.
- **Tanpa izin:** staf A tanpa izin mendapat 403. Staf yang hanya punya `issue` tidak bisa `revoke`.
- **Lintas tenant:** staf yang punya izin di A mendapat 403 untuk peserta/sertifikat B, termasuk bila ia juga anggota B tanpa izin.
- **Pencabutan:** setelah `DELETE`, akses berikutnya 403. Baris tetap ada dengan `revoked_at/revoked_by`. Pemberian ulang membuat baris aktif baru.
- **Kewenangan:** non-super_admin (Travel, Vendor, dan lainnya) memanggil endpoint grant/revoke → 403. Self-grant ditolak di API dan trigger. `membershipId` dari organisasi lain → 404. Kode di luar lima kode → 400 (trigger juga menolak).
- **Audit log:** grant dan revoke masing-masing menulis satu baris audit dengan aktor, organisasi, dan `entity_id` yang benar. Kegagalan audit atau outbox me-rollback perubahan izin.
- **Migrasi:** apply dua kali tidak menghasilkan perubahan kedua, dan tidak ada baris izin terisi otomatis.

## 9. Keputusan yang diperlukan
1. Apakah Super Admin satu-satunya pemberi izin (rancangan ini), atau perlu izin `travel.members.manage` agar pemilik organisasi Travel kelak dapat mengelola timnya sendiri? Itu tahap berikutnya dan juga tanpa self-grant.
2. Apakah pemberian `travel.certificates.revoke` mensyaratkan `issue` juga ada? Rancangan ini memperlakukan keduanya independen.
