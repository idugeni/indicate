-- Public-bucket key prefix: `pub/`-scoped keys live in the public R2 bucket
-- (same tenant layout beneath the prefix) while legacy and `o/` keys stay
-- private. Amends both owner-prefix checks without weakening them: the
-- organization scoping is preserved inside the public branch.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.media DROP CONSTRAINT media_owner_prefix;--> statement-breakpoint
ALTER TABLE public.media ADD CONSTRAINT media_owner_prefix CHECK ((
  (article_id IS NOT NULL AND (object_key LIKE ('articles/' || article_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/article/' || article_id::text || '/%')))
  OR (site_id IS NOT NULL AND (object_key LIKE ('sites/' || site_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/site/' || site_id::text || '/%')))
  OR (organization_asset AND (object_key LIKE 'assets/%' OR object_key LIKE ('o/' || organization_id::text || '/p/%/organization/%')))
  OR (object_key LIKE ('pub/o/' || organization_id::text || '/%'))
));--> statement-breakpoint
ALTER TABLE public.media_key_reservations DROP CONSTRAINT media_key_reservation_owner_prefix;--> statement-breakpoint
ALTER TABLE public.media_key_reservations ADD CONSTRAINT media_key_reservation_owner_prefix CHECK ((
  (article_id IS NOT NULL AND (object_key LIKE ('articles/' || article_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/article/' || article_id::text || '/%')))
  OR (site_id IS NOT NULL AND (object_key LIKE ('sites/' || site_id::text || '/%') OR object_key LIKE ('o/' || organization_id::text || '/p/%/site/' || site_id::text || '/%')))
  OR (organization_asset AND (object_key LIKE 'assets/%' OR object_key LIKE ('o/' || organization_id::text || '/p/%/organization/%')))
  OR (object_key LIKE ('pub/o/' || organization_id::text || '/%'))
));--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (162, 'media_public_prefix', 'sha256:71e0a1b284efde6cbdbb26d521c4f6369eeb3aa2de5dc12de1cd7a6a5f444f9e');
