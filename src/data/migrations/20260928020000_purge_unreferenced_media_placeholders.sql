-- Purge the unreferenced media placeholders that accumulated in the private R2
-- bucket, and schedule the object deletes through the platform's own durable
-- queue instead of deleting bytes out of band.
--
-- Three groups, all `active` in `media` and all unreferenced by every
-- reference surface the schema has: `site_settings.logo_media_id`,
-- `site_settings.favicon_media_id`, `site_settings.default_media_id`,
-- `articles.lead_media_id`, `article_sites.custom_image_media_id`, and the
-- `media:{uuid}` embeds inside `articles.body_json`.
--
-- 1. `site-default` (68 rows). Two generations exist per site: the
--    `og-default` card the backfill wrote, and the `site-default` card the
--    tenant application wrote when the brand gradient landed. `delivery` serves
--    `settings.default_media_id` and falls back to a static asset when that
--    pointer is null, so the second generation was never rendered. Nothing
--    re-points to it either: `propagateBrandMedia` only rewrites portals that
--    already pointed at the previous id, it never picks a replacement from the
--    remaining active rows.
--
-- 2. `article-inline` (1 row). An upload that completed after the body was
--    already re-pointed elsewhere, so no embed references it. Its predecessor
--    at the same body position is already `archived` and already purged.
--
-- 3. `organization-asset` (59 rows). The 2026-09-24 backfill copied one file,
--    `24-logo-kemenimipas.png`, into every tenant Organization. All 60 copies
--    share a single ETag, so 59 of them are pure duplication, and none is
--    referenced: organization assets become publicly visible only through a
--    published copy that references them. The platform Organization's own copy
--    is excluded and stays `active`, because that one is the operator's own
--    brand asset rather than a tenant placeholder.
--
-- Four of the 59 rows are the reason this migration also matters: their object
-- was uploaded under a corrupted `o/{org}` prefix spliced from the neighbouring
-- Organization id, so the row points at a key that was never written while the
-- bytes sit under a prefix no row can address. Archiving them is still correct
-- — the placeholder has no bytes to serve — and the media-versus-R2
-- reconciliation added in the same release reports both halves of that class
-- from now on.
--
-- The predicate is structural: it names purposes and reference surfaces, never
-- a media id, an object key, or a filename token, so it cannot drift into
-- deleting a row that became referenced after the count below was taken. The
-- guard refuses to run unless the shape is still exactly 68 / 1 / 59, and the
-- second guard re-runs the same predicate afterwards and fails if a single row
-- survives. Both run in the transaction that archives the rows, so a reference
-- that appears between the two statements rolls the whole migration back.
--
-- Object bytes are not deleted here. Each archived row gets an
-- `object_cleanup_tasks` row, which the existing reconciler claims
-- (`indicate_private.claim_media_cleanup_tasks`, cron every five minutes), and
-- which deletes the object and records the outcome. That keeps the intent in
-- Postgres before the external effect, keeps the delete resumable and
-- idempotent, and avoids a hand-run `DeleteObject` that no later reconciliation
-- would notice. `archiveMedia` in the publishing repository never enqueued this
-- task, which is why unreferenced rows outlived their bytes until now; that
-- gap is closed in the same release.
--
-- `audit_logs` rows are never touched: insert-only by design with daily WORM
-- export (see docs/migrations.md). One `media.archive` row is appended per
-- archived row so the purge is on the record.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  pending integer;
  site_default_rows integer;
  article_inline_rows integer;
  organization_asset_rows integer;
  platform_rows integer;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE purpose = 'site-default'),
         count(*) FILTER (WHERE purpose = 'article-inline'),
         count(*) FILTER (WHERE purpose = 'organization-asset')
    INTO pending, site_default_rows, article_inline_rows, organization_asset_rows
    FROM public.media AS m
   WHERE m.state = 'active'
     AND m.purpose IN ('site-default', 'article-inline', 'organization-asset')
     AND (m.purpose <> 'organization-asset'
          OR m.organization_id <> '7e27727d-b59f-4d24-998e-1bee6eeb3fa0'::uuid)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s
                      WHERE s.logo_media_id = m.id OR s.favicon_media_id = m.id OR s.default_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.lead_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.article_sites AS x WHERE x.custom_image_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS b
                      WHERE b.body_json::text ~ ('media:' || m.id::text || '(?![0-9a-f-])'));

  IF pending <> 128 OR site_default_rows <> 68 OR article_inline_rows <> 1 OR organization_asset_rows <> 59 THEN
    RAISE EXCEPTION
      'purge_unreferenced_media_placeholders_shape_changed: expected 68/1/59 = 128, found %/%/% = %',
      site_default_rows, article_inline_rows, organization_asset_rows, pending;
  END IF;

  SELECT count(*) INTO platform_rows
    FROM public.media AS m
   WHERE m.state = 'active'
     AND m.purpose = 'organization-asset'
     AND m.organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0'::uuid;

  IF platform_rows <> 1 THEN
    RAISE EXCEPTION
      'purge_unreferenced_media_placeholders_platform_asset_missing: expected the platform organization brand asset to stay active, found %', platform_rows;
  END IF;
END;
$$;--> statement-breakpoint
WITH archived AS (
  UPDATE public.media AS m
     SET state = 'archived',
         version = m.version + 1,
         updated_at = now()
   WHERE m.state = 'active'
     AND m.purpose IN ('site-default', 'article-inline', 'organization-asset')
     AND (m.purpose <> 'organization-asset'
          OR m.organization_id <> '7e27727d-b59f-4d24-998e-1bee6eeb3fa0'::uuid)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s
                      WHERE s.logo_media_id = m.id OR s.favicon_media_id = m.id OR s.default_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.lead_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.article_sites AS x WHERE x.custom_image_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS b
                      WHERE b.body_json::text ~ ('media:' || m.id::text || '(?![0-9a-f-])'))
  RETURNING m.organization_id, m.id, m.purpose, m.state, m.version, m.object_key
), scheduled AS (
  INSERT INTO public.object_cleanup_tasks (
    organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at
  )
  SELECT organization_id, gen_random_uuid(), object_key, 'media.archived', 'pending', 0, now(), now(), now()
    FROM archived
  RETURNING organization_id
), audited AS (
  INSERT INTO public.audit_logs (
    organization_id, id, actor_type, actor_id, entry_point, action, target_type,
    target_id, outcome, changed_fields, before, request_id
  )
  SELECT organization_id,
         gen_random_uuid(),
         'system'::public.audit_actor_type,
         'migration:purge_unreferenced_media_placeholders',
         'worker'::public.audit_entry_point,
         'media.archive',
         'media',
         id::text,
         'succeeded'::public.audit_outcome,
         ARRAY['state'],
         jsonb_build_object(
           'id', id,
           'purpose', purpose,
           'state', 'active',
           'objectKey', object_key
         ),
         'migration:211'
    FROM archived
  RETURNING organization_id
)
SELECT (SELECT count(*) FROM archived) AS archived,
       (SELECT count(*) FROM scheduled) AS scheduled,
       (SELECT count(*) FROM audited) AS audited;--> statement-breakpoint
DO $$
DECLARE
  remaining integer;
  platform_rows integer;
  scheduled integer;
BEGIN
  SELECT count(*) INTO remaining
    FROM public.media AS m
   WHERE m.state = 'active'
     AND m.purpose IN ('site-default', 'article-inline', 'organization-asset')
     AND (m.purpose <> 'organization-asset'
          OR m.organization_id <> '7e27727d-b59f-4d24-998e-1bee6eeb3fa0'::uuid)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s
                      WHERE s.logo_media_id = m.id OR s.favicon_media_id = m.id OR s.default_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.lead_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.article_sites AS x WHERE x.custom_image_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS b
                      WHERE b.body_json::text ~ ('media:' || m.id::text || '(?![0-9a-f-])'));

  IF remaining <> 0 THEN
    RAISE EXCEPTION 'purge_unreferenced_media_placeholders_incomplete: % unreferenced rows remain active', remaining;
  END IF;

  SELECT count(*) INTO platform_rows
    FROM public.media AS m
   WHERE m.state = 'active'
     AND m.purpose = 'organization-asset'
     AND m.organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0'::uuid;

  IF platform_rows <> 1 THEN
    RAISE EXCEPTION 'purge_unreferenced_media_placeholders_platform_asset_lost: % platform rows active', platform_rows;
  END IF;

  SELECT count(*) INTO scheduled
    FROM public.object_cleanup_tasks
   WHERE reason = 'media.archived' AND status = 'pending';

  RAISE NOTICE 'purge_unreferenced_media_placeholders_done: % cleanup tasks pending', scheduled;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (211, 'purge_unreferenced_media_placeholders', 'sha256:369b1119da9cce3418f5d8f992a9c8f1f3979c88b1b0b048cbb0495fde8d6c2f');
