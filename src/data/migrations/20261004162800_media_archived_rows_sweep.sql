-- Hapus baris media arsip yang tak dirujuk siapa pun setelah 90 hari.
--
-- Byte arsip sudah dikuras reconciler lewat `object_cleanup_tasks`, tetapi
-- barisnya menumpuk selamanya sebagai batu nisan: tidak ada kategori sweep
-- yang menghapusnya. Kategori `media_archived_rows` menutup celah itu.
--
-- Predikat pengaman: hanya `state = 'archived'` lebih tua dari 90 hari,
-- tanpa rujukan artikel (sampul/galeri/isi), brand portal, maupun override
-- gambar, tanpa cleanup task terbuka untuk kuncinya (byte mungkin belum
-- terkuras), dan tidak pernah untuk organisasi yang di-hold. Menghapus baris
-- yang byte-nya masih ada akan melahirkan yatim R2 tanpa baris, jadi kunci
-- yang masih punya task terbuka dikecualikan.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
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
  DELETE FROM public.media AS asset
   WHERE asset.state = 'archived'
     AND asset.updated_at < now() - interval '90 days'
     AND NOT indicate_private.is_org_held(asset.organization_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.articles AS a
        WHERE a.organization_id = asset.organization_id
          AND (a.lead_media_id = asset.id
            OR a.body LIKE '%' || asset.id::text || '%'
            OR COALESCE(a.body_json::text, '') LIKE '%' || asset.id::text || '%')
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.site_settings AS s
        WHERE s.organization_id = asset.organization_id
          AND (s.logo_media_id = asset.id OR s.favicon_media_id = asset.id OR s.default_media_id = asset.id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.article_sites AS t
        WHERE t.organization_id = asset.organization_id
          AND t.custom_image_media_id = asset.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.object_cleanup_tasks AS task
        WHERE task.organization_id = asset.organization_id
          AND task.object_key = asset.object_key
          AND task.status IN ('pending', 'processing', 'failed')
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('media_archived_rows', v_count, v_started, now());
  v_total := v_total + v_count;
  RETURN v_total;
END;
$$;--> statement-breakpoint
SELECT indicate_private.retention_sweep();--> statement-breakpoint
DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
    FROM public.media AS asset
   WHERE asset.state = 'archived'
     AND asset.updated_at < now() - interval '90 days'
     AND NOT indicate_private.is_org_held(asset.organization_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.articles AS a
        WHERE a.organization_id = asset.organization_id
          AND (a.lead_media_id = asset.id
            OR a.body LIKE '%' || asset.id::text || '%'
            OR COALESCE(a.body_json::text, '') LIKE '%' || asset.id::text || '%')
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.site_settings AS s
        WHERE s.organization_id = asset.organization_id
          AND (s.logo_media_id = asset.id OR s.favicon_media_id = asset.id OR s.default_media_id = asset.id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.article_sites AS t
        WHERE t.organization_id = asset.organization_id
          AND t.custom_image_media_id = asset.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.object_cleanup_tasks AS task
        WHERE task.organization_id = asset.organization_id
          AND task.object_key = asset.object_key
          AND task.status IN ('pending', 'processing', 'failed')
     );
  IF remaining > 0 THEN
    RAISE EXCEPTION 'media_archived_rows_incomplete: % archived row(s) still eligible', remaining;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (262, 'media_archived_rows_sweep', 'sha256:5f409a9e93308e7107b41bbf85e5a0e5e1724ca9b9435edb380c9789879dd618');
