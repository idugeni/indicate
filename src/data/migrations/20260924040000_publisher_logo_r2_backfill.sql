-- Backfill publisher Kemenimipas logos from static /brand file to per-org R2.
--
-- 39 active publishers still reference `/brand/logo-kemenimipas.png` while the
-- per-org R2 bytes already exist at
-- `o/{org}/p/organization-asset/y=2026/m=09/organization/24-logo-kemenimipas.png`
-- (216122 bytes, image/png, 512x512). Link each orphan org with a
-- reservation (used) + media (active, organization-asset) row, then point
-- publishers.contacts.logoUrl at `/api/network/media/{id}` so
-- authorizePublicMedia serves it per-host. Idempotent: only touches rows
-- still on the static path; ON CONFLICT DO NOTHING on object_key.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
WITH targets AS (
  SELECT p.organization_id, p.id AS publisher_id
  FROM public.publishers AS p
  WHERE p.status = 'active' AND (p.contacts ->> 'logoUrl') = '/brand/logo-kemenimipas.png'
), keys AS (
  SELECT organization_id, publisher_id,
    ('o/' || organization_id::text || '/p/organization-asset/y=2026/m=09/organization/24-logo-kemenimipas.png') AS object_key
  FROM targets
), res AS (
  INSERT INTO public.media_key_reservations (organization_id, id, object_key, purpose, article_id, site_id, organization_asset, expected_media_type, expected_size_bytes, expected_checksum, status, expires_at, created_at, updated_at)
  SELECT k.organization_id, gen_random_uuid(), k.object_key, 'organization-asset', NULL, NULL, true, 'image/png', 216122, 'TgbiZvGpUj2/Tjt5SFMgelZlb0t2dM8B/fXXxgqFm78=', 'used', now() + interval '30 days', now(), now()
  FROM keys AS k
  ON CONFLICT (object_key) DO NOTHING
  RETURNING organization_id, object_key
), ins_media AS (
  INSERT INTO public.media (organization_id, id, object_key, purpose, media_type, size_bytes, checksum, thumb_object_key, width_px, height_px, license_source, attribution, state, article_id, site_id, organization_asset, version, created_at, updated_at)
  SELECT k.organization_id, gen_random_uuid(), k.object_key, 'organization-asset', 'image/png', 216122, '4e06e266f1a9523dbf4e3b794853207a56656f4b7674cf01fdf5d7c60a859bbf', NULL, 512, 512, NULL, NULL, 'active', NULL, NULL, true, 1, now(), now()
  FROM keys AS k
  ON CONFLICT (object_key) DO NOTHING
  RETURNING organization_id, id, object_key
)
UPDATE public.publishers AS p
SET contacts = p.contacts || jsonb_build_object('logoUrl', '/api/network/media/' || m.id::text), updated_at = now()
FROM ins_media AS m
WHERE p.organization_id = m.organization_id
  AND p.status = 'active'
  AND (p.contacts ->> 'logoUrl') = '/brand/logo-kemenimipas.png';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (167, 'publisher_logo_r2_backfill', 'sha256:3132225e69530f74d05fc77ae0a0124bd7a9287c475a1b986404d8ccb41a68e2');
