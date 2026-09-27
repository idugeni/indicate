-- Tagline khusus per site: slogan pendek buatan redaksi, bukan potongan deskripsi.
-- Expand (nullable); baca fallback ke deskripsi bila NULL; backfill data terpisah.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS "tagline" text;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (118, 'site_settings_tagline', 'sha256:2ba1af0056cc1d0ddf87e291f4ae4443257e216a234b19628770d931fea5a2ff');
