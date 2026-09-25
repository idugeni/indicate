-- Keep only the cache bypasses that are actually active.
--
-- `readBypassed()` treats a missing row as "not bypassing", so once an
-- invalidation completes its row carries no information: the table ends up with
-- one row per portal forever, describing the default state. That is the same
-- shape the refactor residue cleanup found in migration 190, and every onboarding
-- wave brings it back: the ten newest tenants alone produced 330 rows, of which
-- 190 were live `invalidation_pending` bypasses and the rest had already
-- completed and were pure noise.
--
-- The sweep therefore deletes rows whose bypass is off and leaves every active
-- bypass untouched, which turns the table back into what the delivery read
-- actually asks: "is this portal bypassing right now". A portal with an
-- in-flight invalidation keeps its bypass until the reconciler finishes, because
-- the guard refuses the whole migration if any such portal would lose it.
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
  DELETE FROM public.object_cleanup_tasks WHERE status = 'completed' AND updated_at < now() - interval '90 days' AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('object_cleanup_tasks', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.invalidation_tasks WHERE status IN ('completed', 'failed') AND updated_at < now() - interval '90 days' AND NOT indicate_private.is_org_held(organization_id);
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
   WHERE r.created_at < now() - interval '90 days'
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
DO $$
DECLARE
  inert_left integer;
  bypass_lost integer;
BEGIN
  SELECT count(*) INTO inert_left FROM public.cache_bypasses WHERE NOT bypass;
  IF inert_left > 0 THEN
    RAISE EXCEPTION 'cache_bypass_inert_left: % completed bypass row(s) survived', inert_left;
  END IF;
  SELECT count(*) INTO bypass_lost
    FROM public.invalidation_tasks AS task
   WHERE task.status IN ('pending', 'processing')
     AND EXISTS (
       SELECT 1 FROM public.cache_bypasses AS bypass
        WHERE bypass.site_id = task.site_id AND NOT bypass.bypass
     );
  IF bypass_lost > 0 THEN
    RAISE EXCEPTION 'cache_bypass_unsafe: % portal(s) with in-flight invalidation lost their bypass', bypass_lost;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (196, 'retain_only_active_cache_bypasses', 'sha256:64a9a5d54884e2bb0481b728178fc95170b4f7949d5b04ce84a3ad69b29be2fb');
