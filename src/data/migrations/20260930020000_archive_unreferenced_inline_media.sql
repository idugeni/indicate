-- Archive the three `article-inline` uploads that nothing references.
--
-- All three arrived through the application upload path on 2026-09-29: they are
-- WebP, each already carries its derived `-thumb` variant, and each is a
-- 1024x576 object. Nothing points at them on any surface the schema offers:
-- `articles.lead_media_id`, `article_sites.custom_image_media_id`, the
-- `site_settings` brand pointers, and the `media:{id}` embeds inside
-- `articles.body_json` are all empty for these rows. Every one of those
-- surfaces was checked individually rather than inferred, because an inline
-- embed is stored as text inside JSONB and no foreign key would catch a
-- dangling reference there.
--
-- The other 22 active `article-inline` rows are all AVIF, all created
-- 2026-09-27, and every one is referenced from an article body. They stay.
--
-- Object bytes are not deleted here. Each archived row contributes two keys —
-- the object and its thumbnail — to `object_cleanup_tasks`, which the existing
-- reconciler claims (`indicate_private.claim_media_cleanup_tasks`, cron every
-- five minutes). That keeps the intent in Postgres before the external effect
-- and keeps the delete resumable, idempotent, and observable. A hand-run
-- DeleteObject would leave nothing behind for a later reconciliation to notice.
--
-- The predicate is structural: it names a purpose and the set of reference
-- surfaces, never a media id, object key, or filename token, so it cannot
-- drift into archiving a row that became referenced after the counts below
-- were taken. The guard refuses to run unless the shape is exactly 3 active
-- unreferenced rows, and the second guard re-runs the predicate afterwards and
-- fails if a single survivor remains. Both run in the transaction that archives
-- the rows, so a reference that appears between the two statements rolls the
-- whole migration back.
--
-- `audit_logs` rows are never touched: insert-only by design with daily WORM
-- export (see docs/migrations.md). One `media.archive` row is appended per
-- archived row so the purge is on the record.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $migration$
DECLARE
  orphans integer;
  with_thumb integer;
  survivors integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE m.thumb_object_key IS NOT NULL)
    INTO orphans, with_thumb
    FROM public.media AS m
   WHERE m.purpose = 'article-inline'
     AND m.state = 'active'
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.lead_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.article_sites AS x WHERE x.custom_image_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s
                      WHERE s.logo_media_id = m.id
                         OR s.favicon_media_id = m.id
                         OR s.default_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS b
                      WHERE b.body_json::text ~ ('media:' || m.id::text || '(?![0-9a-f-])'));

  IF orphans <> 3 OR with_thumb <> 3 THEN
    RAISE EXCEPTION
      'archive_unreferenced_inline_media_shape_changed: orphans=% with_thumb=%', orphans, with_thumb;
  END IF;
END
$migration$;
--> statement-breakpoint
WITH orphaned AS (
  SELECT m.id, m.organization_id, m.object_key, m.thumb_object_key
    FROM public.media AS m
   WHERE m.purpose = 'article-inline'
     AND m.state = 'active'
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.lead_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.article_sites AS x WHERE x.custom_image_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s
                      WHERE s.logo_media_id = m.id
                         OR s.favicon_media_id = m.id
                         OR s.default_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS b
                      WHERE b.body_json::text ~ ('media:' || m.id::text || '(?![0-9a-f-])'))
), archived AS (
  UPDATE public.media AS m
     SET state = 'archived',
         version = m.version + 1,
         updated_at = now()
    FROM orphaned AS o
   WHERE m.id = o.id
  RETURNING m.organization_id, m.id, m.object_key, m.thumb_object_key
), scheduled AS (
  INSERT INTO public.object_cleanup_tasks (
    organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at
  )
  SELECT key.organization_id, gen_random_uuid(), key.object_key, 'media.archived', 'pending', 0, now(), now(), now()
    FROM (
      SELECT organization_id, object_key FROM archived WHERE object_key IS NOT NULL
      UNION ALL
      SELECT organization_id, thumb_object_key FROM archived WHERE thumb_object_key IS NOT NULL
    ) AS key
  RETURNING organization_id
), audited AS (
  INSERT INTO public.audit_logs (
    organization_id, id, actor_type, actor_id, entry_point, action, target_type,
    target_id, outcome, changed_fields, before, request_id
  )
  SELECT organization_id,
         gen_random_uuid(),
         'system'::public.audit_actor_type,
         'migration:archive_unreferenced_inline_media',
         'worker'::public.audit_entry_point,
         'media.archive',
         'media',
         id::text,
         'succeeded'::public.audit_outcome,
         ARRAY['state'],
         jsonb_build_object(
           'id', id,
           'purpose', 'article-inline',
           'state', 'active',
           'objectKey', object_key,
           'thumbObjectKey', thumb_object_key
         ),
         'migration:221'
    FROM archived
  RETURNING organization_id
)
SELECT (SELECT count(*) FROM archived) AS archived,
       (SELECT count(*) FROM scheduled) AS scheduled,
       (SELECT count(*) FROM audited) AS audited;
--> statement-breakpoint
DO $migration$
DECLARE
  remaining integer;
  scheduled integer;
BEGIN
  SELECT count(*) INTO remaining
    FROM public.media AS m
   WHERE m.purpose = 'article-inline'
     AND m.state = 'active'
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.lead_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.article_sites AS x WHERE x.custom_image_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s
                      WHERE s.logo_media_id = m.id
                         OR s.favicon_media_id = m.id
                         OR s.default_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.articles AS b
                      WHERE b.body_json::text ~ ('media:' || m.id::text || '(?![0-9a-f-])'));

  IF remaining <> 0 THEN
    RAISE EXCEPTION 'archive_unreferenced_inline_media_incomplete: % unreferenced rows remain active', remaining;
  END IF;

  SELECT count(*) INTO scheduled
    FROM public.object_cleanup_tasks
   WHERE reason = 'media.archived' AND status = 'pending';

  RAISE NOTICE 'archive_unreferenced_inline_media_done: % cleanup tasks pending', scheduled;
END
$migration$;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (221, 'archive_unreferenced_inline_media', 'sha256:0fb6ff7775331a58fb0d2570128e184aef93892c222e4288ac7b4c474a83125d');
