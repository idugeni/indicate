-- Cross-tenant reader for the media-versus-R2 reconciliation, plus the two
-- indexes that keep it affordable.
--
-- The reconciliation compares what the R2 buckets actually hold against what
-- `media` claims to hold. Two drift classes showed up in the 2026-09-28 audit
-- and neither was visible before, because no query ever looked at both sides:
--
--   * a `media` row whose `object_key` was never written. Four rows from the
--     2026-09-24 organization-asset backfill point at a key that does not
--     exist, so `/api/network/media/{id}` would 404 for them. The upload used
--     an `o/{org}` prefix spliced from the neighbouring Organization id while
--     the row recorded the correct key, so the `media_owner_prefix` check
--     passed on the database side and nothing flagged the storage side.
--
--   * an R2 object no `media` row can address. The bytes from those same four
--     uploads sit under a prefix that matches no Organization, so no
--     reconciliation, invalidation, or cleanup queue could ever name them.
--
-- Reading every Organization's media rows needs a role that is not
-- tenant-scoped: the `media` row-level policies compare `organization_id`
-- against `indicate_private.current_organization_id()`, which is NULL for the
-- system reconciler, so the runtime role sees zero rows. This function is the
-- same shape as `read_runtime_config_active_domains` — `STABLE`, `SECURITY
-- DEFINER`, a pinned `search_path`, `REVOKE`d from `PUBLIC` and granted only to
-- the runtime role — and returns keys only, never object bytes, so the
-- reconciliation cannot become a read path for tenant media.
--
-- The reconciliation never deletes from this function's output. It reports
-- drift; removal still happens through `object_cleanup_tasks` and the
-- reconciler that claims them, so an operator decision and a durable queue row
-- stand between the report and an irreversible delete.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.read_media_object_keys()
 RETURNS TABLE(organization_id uuid, media_id uuid, object_key text, thumb_object_key text, purpose text, state media_state)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT m.organization_id, m.id, m.object_key, m.thumb_object_key, m.purpose, m.state
  FROM public.media AS m
  WHERE m.object_key IS NOT NULL
  ORDER BY m.organization_id, m.id;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_media_object_keys() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_media_object_keys() TO indicate_runtime;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS media_object_key_idx ON public.media (object_key) WHERE object_key IS NOT NULL;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (212, 'media_object_key_reconciliation_reader', 'sha256:4e866b10ad9a9cdabc60ec5ae9bae0832c8fae0367f9808cdcec997262175ef6');
