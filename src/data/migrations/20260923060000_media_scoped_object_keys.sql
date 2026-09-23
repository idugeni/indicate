-- Expand media keys to tenant-scoped layout alongside legacy flat keys.
-- New format: o/{organization_id}/p/{purpose}/y={YYYY}/m={MM}/{owner}/{day}-{stem}-{token16}.{ext}
-- Dual-read: legacy assets/, articles/, sites/ keys remain valid; new reserves
-- must start with o/{organization_id}/ and carry the matching owner segment.
-- Backfill scope: active media plus non-expired reservations only; expired or
-- rejected rows are left to natural cleanup. Thumb keys inherit the base key.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.media DROP CONSTRAINT media_owner_prefix;--> statement-breakpoint
ALTER TABLE public.media ADD CONSTRAINT media_owner_prefix CHECK ((
  (article_id IS NOT NULL AND (object_key LIKE ('articles/' || article_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/article/' || article_id::text || '/%')))
  OR (site_id IS NOT NULL AND (object_key LIKE ('sites/' || site_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/site/' || site_id::text || '/%')))
  OR (organization_asset AND (object_key LIKE 'assets/%' OR object_key LIKE ('o/' || organization_id::text || '/p/%/organization/%')))
));--> statement-breakpoint
ALTER TABLE public.media_key_reservations DROP CONSTRAINT media_key_reservation_owner_prefix;--> statement-breakpoint
ALTER TABLE public.media_key_reservations ADD CONSTRAINT media_key_reservation_owner_prefix CHECK ((
  (article_id IS NOT NULL AND (object_key LIKE ('articles/' || article_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/article/' || article_id::text || '/%')))
  OR (site_id IS NOT NULL AND (object_key LIKE ('sites/' || site_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/site/' || site_id::text || '/%')))
  OR (organization_asset AND (object_key LIKE 'assets/%' OR object_key LIKE ('o/' || organization_id::text || '/p/%/organization/%')))
));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS media_organization_purpose_state_idx ON public.media USING btree (organization_id, purpose, state);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (159, 'media_scoped_object_keys', 'sha256:071a82ac10bc2e46b13120a93bad25b398e4f87a747251b67dd95cd16e893744');
