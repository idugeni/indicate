-- Perketat jendela retensi baris terminal dari 90 hari ke 30 hari.
--
-- Dashboard snapshot membaca invalidation_tasks tanpa filter umur
-- (orderBy createdAt desc limit 2000), sehingga baris completed yang lebih
-- tua dari 2000 termuda sudah tidak dibaca siapa pun jauh sebelum 90 hari.
-- Menurunkan ambang object_cleanup_tasks, invalidation_tasks, dan
-- publication_transition_receipts ke 30 hari membatasi steady state sekitar
-- tiga kali lebih kecil tanpa mengubah bacaan dasbor hari ini. Guard
-- litigation hold dan klausa keep-latest-per-job tidak berubah; kategori
-- undangan, klaim replay, cache bypass, dan reservasi media tidak disentuh.
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
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (235, 'retention_windows_tighten', 'sha256:7a8ef401f4c981fb5f0d02b6d1eedb0263b8f30abbb7706ffaf08c4049165de8');
