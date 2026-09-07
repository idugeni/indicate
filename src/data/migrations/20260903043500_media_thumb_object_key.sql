-- Store the derived listing-thumbnail key alongside the full media object.
-- Nullable with no backfill: existing rows resolve thumbnails to the full
-- object. The key is derived server-side from `object_key`, never trusted
-- from client input; uniqueness inherits the reservation collision token.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.media ADD COLUMN thumb_object_key text;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (65, 'media_thumb_object_key', 'sha256:89c492d28fa109b8ce1ce0cb10ffb78cf05c88e8a496bbf2bcf01ca3ad943541');
