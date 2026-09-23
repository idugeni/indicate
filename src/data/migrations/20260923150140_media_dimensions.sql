-- Natural image dimensions for social cards: width/height travel with the
-- stored bytes from upload completion, so Open Graph and Twitter tags can
-- state real dimensions instead of a hardcoded 1200x630. Nullable for
-- legacy rows whose dimensions were never captured; consumers fall back
-- to the default when either side is missing.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.media ADD COLUMN width_px integer;--> statement-breakpoint
ALTER TABLE public.media ADD COLUMN height_px integer;--> statement-breakpoint
ALTER TABLE public.media ADD CONSTRAINT media_dimensions_positive CHECK (width_px IS NULL AND height_px IS NULL OR (width_px IS NOT NULL AND height_px IS NOT NULL AND width_px > 0 AND height_px > 0 AND width_px <= 30000 AND height_px <= 30000));--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (160, 'media_dimensions', 'sha256:dbd5ce658a304baf5ba899486304bffe4f16337dee3a33eaf448eba8d09821e1');
