-- Hapus byte yatim dari reservasi upload yang ditinggalkan.
--
-- Alurnya: reserve -> PUT langsung ke R2 -> tanpa media.complete. Reservasinya
-- kedaluwarsa dalam hitungan menit dan disapu menjadi expired, tetapi byte yang
-- terlanjur naik ke R2 tidak punya jalur hapus: tidak ada cleanup task yang
-- dibuat, dan reconciler hanya melaporkan drift object_without_row. Byte yatim
-- itu menumpuk selamanya di bucket.
--
-- Sweep mendapat kategori media_orphan_cleanup yang mengantrekan
-- object_cleanup_tasks untuk setiap reservasi yang mati sebelum jadi media.
-- Reconciler lima-menit yang mengurasnya via deleteExact, yang merupakan no-op
-- aman untuk key yang tidak pernah diupload. Predikat pengaman: hanya status
-- reserved/expired yang lewat tenggat (tidak pernah occupied: key tabrakan
-- bisa menampung byte pihak lain); tidak pernah saat ada baris media yang
-- mengklaim key yang sama; tidak pernah saat sudah ada task terbuka untuk
-- key itu; tidak pernah untuk organisasi yang di-hold. Varian thumb ikut
-- diantrekan dengan turunan yang sama persis dengan buildThumbObjectKey.
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
  RETURN v_total;
END;
$$;--> statement-breakpoint
SELECT indicate_private.retention_sweep();--> statement-breakpoint
DO $$
DECLARE
  orphan integer;
BEGIN
  SELECT count(*) INTO orphan
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
     );
  IF orphan > 0 THEN
    RAISE EXCEPTION 'media_orphan_cleanup_incomplete: % abandoned reservation(s) without a cleanup task', orphan;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (240, 'media_orphan_cleanup', 'sha256:dfe149c28bb2e3da531d91672050ab399ab8973526d1c55e9bebe4631692fef4');
