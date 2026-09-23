-- Bersihkan duplikasi tagline di depan deskripsi site.
-- Kolom tagline lahir belakangan (migrasi 118); backfill mengisi tagline dari
-- awalan deskripsi tanpa memotong deskripsi, sehingga footer menampilkan
-- tagline dua kali. Migrasi ini memotong awalan tagline + pemisah dari
-- deskripsi; idempoten (WHERE hanya menyentuh baris yang masih berawalan tagline).
ALTER TABLE public.site_settings DISABLE TRIGGER site_settings_active_site_guard;--> statement-breakpoint
UPDATE public.site_settings
SET description = btrim(ltrim(substring(description from char_length(tagline) + 1), ' .,;:!?-' || chr(8211) || chr(8212) || '|/')),
    updated_at = now()
WHERE tagline IS NOT NULL
  AND btrim(tagline) <> ''
  AND starts_with(description, tagline)
  AND btrim(ltrim(substring(description from char_length(tagline) + 1), ' .,;:!?-' || chr(8211) || chr(8212) || '|/')) <> '';--> statement-breakpoint
ALTER TABLE public.site_settings ENABLE TRIGGER site_settings_active_site_guard;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (157, 'site_settings_description_strip_tagline', 'sha256:1a6053696d751e354ee092087ca20563cbb7808b13bed824fa958b8fb4ca1199');
