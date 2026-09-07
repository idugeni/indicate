-- Record the site-settings media indexes that exist in live databases but were
-- never captured by a migration. Idempotent: fresh environments gain the
-- indexes, existing ones are untouched. The indexes cover the foreign-key
-- columns used by the delivery media joins.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE INDEX IF NOT EXISTS site_settings_logo_media_idx ON public.site_settings USING btree (organization_id, logo_media_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS site_settings_favicon_media_idx ON public.site_settings USING btree (organization_id, favicon_media_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS site_settings_default_media_idx ON public.site_settings USING btree (organization_id, default_media_id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (66, 'site_settings_media_indexes', 'sha256:2ced167bcaf0262a9a2d61d4b4550fc4fd2f7c6d450e1cf2305a1012e523f0fd');
