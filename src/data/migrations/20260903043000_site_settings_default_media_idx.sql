-- Rename the site-settings default media index to match the column rename in
-- migration 63. Name-only change; the indexed columns are unchanged.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER INDEX public.site_settings_fallback_media_idx RENAME TO site_settings_default_media_idx;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (64, 'site_settings_default_media_idx', 'sha256:2e67a8d1b3b8db4724864707c4fd579de709886b20a66990e9f8e80ac42cbe32');
