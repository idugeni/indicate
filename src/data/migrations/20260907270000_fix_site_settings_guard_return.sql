-- Perbaiki guard site_settings: BEFORE UPDATE yang me-return OLD membuat
-- SEMUA update diam-diam dibuang (Postgres memakai baris yang di-return).
-- Guard ini hanya boleh menolak (RAISE) saat invalidasi settings site aktif;
-- jalur lolos harus me-return NEW agar update benar-benar tersimpan.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.guard_site_settings_against_active_site()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sites AS s
    WHERE s.organization_id = OLD.organization_id
      AND s.id = OLD.site_id
      AND s.status = 'active'
      AND s.activation_state = 'active'
  ) AND (
    OLD.locale IS NULL OR OLD.seo_default_title IS NULL OR OLD.seo_default_description IS NULL
    OR OLD.seo_robots_directive IS NULL OR OLD.seo_open_graph_site_name IS NULL OR OLD.seo_schema_version IS NULL
    OR OLD.default_media_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot invalidate site settings while the site is active' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (104, 'fix_site_settings_guard_return', 'sha256:1f798db5acb1e6a468e3bacadd78a5cefa236b05fe2f8d6ce9fbc2597a2484a6');
