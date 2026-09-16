-- Tagline khusus per site: slogan pendek buatan redaksi, bukan potongan deskripsi.
-- Expand (nullable); baca fallback ke deskripsi bila NULL; backfill data terpisah.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS "tagline" text;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (118, 'site_settings_tagline', 'sha256:6af1a02e9b5dfbbab5f2ccd6802fc4133a055e3e868918094b8b7b9639708c52');
