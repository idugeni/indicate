-- Arsipkan sampul yatim yang tidak dirujuk siapa pun setelah 90 hari.
--
-- Mengunggah sampul langsung mengaktifkan baris media milik organisasi, dan
-- membatalkan artikel setelahnya membuat baris itu yatim: tidak dirujuk
-- artikel, pengaturan portal, override gambar, maupun badan artikel mana pun.
-- Sweep retensi sebelumnya hanya membereskan reservasi yang tidak selesai,
-- sehingga byte yatim ini menumpuk selamanya di bucket.
--
-- Kriteria yatim sengaja sempit: hanya `purpose = 'article-cover'` milik
-- organisasi (bukan gambar inline atau aset portal), berumur lebih dari 90
-- hari, dan lolos semua pemeriksaan rujukan. `media_shared_guard` tetap
-- menjadi penahan terakhir bila ada rujukan brand yang lolos. Tindakan ini
-- pengarsipan, bukan penghapusan: baris menjadi `archived` dan byte-nya
-- dikuras reconciler lewat `object_cleanup_tasks` (termasuk varian thumb).
-- Organisasi yang di-hold tidak tersentuh.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.sweep_orphan_covers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $$
DECLARE v_count integer := 0;
BEGIN
  WITH orphan AS (
    SELECT m.organization_id, m.id, m.object_key, m.thumb_object_key
      FROM public.media AS m
     WHERE m.state = 'active'
       AND m.purpose = 'article-cover'
       AND m.organization_asset
       AND m.article_id IS NULL
       AND m.site_id IS NULL
       AND m.created_at < now() - interval '90 days'
       AND NOT indicate_private.is_org_held(m.organization_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.articles AS a
          WHERE a.organization_id = m.organization_id
            AND a.lead_media_id = m.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.site_settings AS s
          WHERE s.organization_id = m.organization_id
            AND (s.logo_media_id = m.id OR s.favicon_media_id = m.id OR s.default_media_id = m.id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.article_sites AS t
          WHERE t.organization_id = m.organization_id
            AND t.custom_image_media_id = m.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.articles AS a
          WHERE a.organization_id = m.organization_id
            AND (a.body LIKE '%' || m.id::text || '%' OR COALESCE(a.body_json::text, '') LIKE '%' || m.id::text || '%')
       )
  ),
  archived AS (
    UPDATE public.media AS m
       SET state = 'archived', updated_at = now()
      FROM orphan AS o
     WHERE m.organization_id = o.organization_id AND m.id = o.id AND m.state = 'active'
    RETURNING m.organization_id, m.object_key, m.thumb_object_key
  ),
  keys AS (
    SELECT organization_id, object_key FROM archived
    UNION ALL
    SELECT organization_id, thumb_object_key FROM archived WHERE thumb_object_key IS NOT NULL
  ),
  queued AS (
    INSERT INTO public.object_cleanup_tasks (organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at)
    SELECT organization_id, gen_random_uuid(), object_key, 'media.orphan_cover', 'pending', 0, now(), now(), now()
      FROM keys
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM archived;
  RETURN v_count;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.retention_sweep()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $$
DECLARE v_total integer := 0; v_count integer; v_started timestamptz := now();
BEGIN
  DELETE FROM public.org_invitations WHERE ((accepted_at IS NOT NULL AND accepted_at < now() - interval '90 days') OR (accepted_at IS NULL AND expires_at < now() - interval '90 days')) AND NOT indicate_private.is_org_held(org_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('org_invitations', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.webhook_replay_claims WHERE expires_at < now() AND (organization_id IS NULL OR NOT indicate_private.is_org_held(organization_id));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('webhook_replay_claims', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.object_cleanup_tasks WHERE status = 'completed' AND updated_at < now() - interval '30 days' AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('object_cleanup_tasks', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.invalidation_tasks WHERE status IN ('completed', 'failed') AND updated_at < now() - interval '30 days' AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('invalidation_tasks', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.cache_bypasses AS bypass
   WHERE NOT bypass.bypass
     AND NOT indicate_private.is_org_held(bypass.organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('cache_bypasses', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.publication_transition_receipts r
   WHERE r.created_at < now() - interval '30 days'
     AND NOT indicate_private.is_org_held(r.organization_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.publication_transition_receipts latest
        WHERE latest.organization_id = r.organization_id
          AND latest.job_id = r.job_id
          AND (latest.created_at, latest.id) > (r.created_at, r.id)
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('publication_transition_receipts', v_count, v_started, now());
  v_total := v_total + v_count;
  WITH abandoned AS (
    SELECT reservation.organization_id, reservation.object_key
      FROM public.media_key_reservations AS reservation
     WHERE reservation.status IN ('reserved', 'expired')
       AND reservation.expires_at < now()
       AND NOT EXISTS (
         SELECT 1 FROM public.media AS asset
          WHERE asset.organization_id = reservation.organization_id
            AND asset.object_key = reservation.object_key
       )
       AND NOT indicate_private.is_org_held(reservation.organization_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.object_cleanup_tasks AS task
          WHERE task.organization_id = reservation.organization_id
            AND task.object_key = reservation.object_key
            AND task.status IN ('pending', 'processing', 'failed')
       )
  ),
  keys AS (
    SELECT organization_id, object_key FROM abandoned
    UNION ALL
    SELECT organization_id,
           CASE WHEN object_key ~ '\.[a-z0-9]{1,10}$'
                THEN regexp_replace(object_key, '\.[a-z0-9]{1,10}$', '') || '-thumb' || substring(object_key from '\.[a-z0-9]{1,10}$')
                ELSE object_key || '-thumb' END
      FROM abandoned
  )
  INSERT INTO public.object_cleanup_tasks (organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at)
  SELECT organization_id, gen_random_uuid(), object_key, 'reservation.abandoned', 'pending', 0, now(), now(), now()
    FROM keys;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('media_orphan_cleanup', v_count, v_started, now());
  v_total := v_total + v_count;
  UPDATE public.media_key_reservations AS reservation
     SET status = 'expired', updated_at = now()
   WHERE reservation.status IN ('reserved', 'occupied')
     AND reservation.expires_at < now()
     AND NOT EXISTS (
       SELECT 1 FROM public.media AS asset
        WHERE asset.organization_id = reservation.organization_id
          AND asset.object_key = reservation.object_key
     )
     AND NOT indicate_private.is_org_held(reservation.organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total := v_total + v_count;
  DELETE FROM public.media_key_reservations AS reservation
   WHERE reservation.status = 'used'
     AND reservation.updated_at < now() - interval '3 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.media AS asset
        WHERE asset.organization_id = reservation.organization_id
          AND asset.object_key = reservation.object_key
     )
     AND NOT indicate_private.is_org_held(reservation.organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total := v_total + v_count;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('media_key_reservations', v_count, v_started, now());
  SELECT indicate_private.sweep_orphan_covers() INTO v_count;
  v_total := v_total + v_count;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('media_orphan_covers', v_count, v_started, now());
  RETURN v_total;
END;
$$;--> statement-breakpoint
SELECT indicate_private.sweep_orphan_covers();--> statement-breakpoint
DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
    FROM public.media AS m
   WHERE m.state = 'active'
     AND m.purpose = 'article-cover'
     AND m.organization_asset
     AND m.article_id IS NULL
     AND m.site_id IS NULL
     AND m.created_at < now() - interval '90 days'
     AND NOT indicate_private.is_org_held(m.organization_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.articles AS a
        WHERE a.organization_id = m.organization_id
          AND a.lead_media_id = m.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.site_settings AS s
        WHERE s.organization_id = m.organization_id
          AND (s.logo_media_id = m.id OR s.favicon_media_id = m.id OR s.default_media_id = m.id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.article_sites AS t
        WHERE t.organization_id = m.organization_id
          AND t.custom_image_media_id = m.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.articles AS a
        WHERE a.organization_id = m.organization_id
          AND (a.body LIKE '%' || m.id::text || '%' OR COALESCE(a.body_json::text, '') LIKE '%' || m.id::text || '%')
     );
  IF remaining > 0 THEN
    RAISE EXCEPTION 'orphan_cover_sweep_incomplete: % orphan cover(s) still active', remaining;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (242, 'orphan_cover_sweep', 'sha256:74f76412a0df66dbecf59fdfa0a86a1a57dbb06a9f1e538fd77f1a3c496a4e9b');
