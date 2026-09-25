-- Let an expired media key reservation release its object key.
--
-- `media_key_reservations_object_key_unique` was a plain unique index on
-- `object_key`, and `reserveMediaKey` inserts with ON CONFLICT DO NOTHING on
-- that key, answering `occupied` whenever any row already claims it. Nothing
-- ever expired or deleted those rows: `retention_sweep` covers five
-- operational queues but not this one, and no code path writes the `expired`
-- status at all. One reservation is stuck in exactly that state today,
-- reserved on 2026-09-23, past its expiry, with no `media` row for the object
-- it claimed, so that key can never be reserved again and the failure is
-- silent.
--
-- The index becomes partial: an `expired` row keeps the audit trail but stops
-- blocking the key. Postgres has no partial unique *constraint*, only a partial
-- unique index, so the constraint is dropped and the guarantee is restated as
-- that index. `retention_sweep` gains a `media_key_reservations` category that
-- expires reservations past their deadline which never produced media, and
-- `reserveMediaKey` runs the same expiry before its insert so a key recovers on
-- the next attempt instead of waiting for the 03:00 run.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.media_key_reservations
  DROP CONSTRAINT media_key_reservations_object_key_unique;--> statement-breakpoint
CREATE UNIQUE INDEX media_key_reservations_object_key_unique
  ON public.media_key_reservations USING btree (object_key)
  WHERE status <> 'expired';--> statement-breakpoint
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
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('media_key_reservations', v_count, v_started, now());
  v_total := v_total + v_count;
  RETURN v_total;
END;
$$;--> statement-breakpoint
SELECT indicate_private.retention_sweep();--> statement-breakpoint
DO $$
DECLARE
  blocking integer;
  expired integer;
  leaked integer;
  index_def text;
BEGIN
  SELECT count(*) INTO blocking
    FROM public.media_key_reservations
   WHERE status IN ('reserved', 'occupied') AND expires_at < now();
  IF blocking > 0 THEN
    RAISE EXCEPTION 'reservation_expiry_incomplete: % reservation(s) past their deadline still block their key', blocking;
  END IF;
  SELECT count(*) INTO expired FROM public.media_key_reservations WHERE status = 'expired';
  IF expired < 1 THEN
    RAISE EXCEPTION 'reservation_expiry_incomplete: the stuck reservation was not expired';
  END IF;
  SELECT count(*) INTO leaked
    FROM public.media_key_reservations AS reservation
    JOIN public.media AS asset
      ON asset.organization_id = reservation.organization_id
     AND asset.object_key = reservation.object_key
   WHERE reservation.status = 'expired';
  IF leaked > 0 THEN
    RAISE EXCEPTION 'reservation_expiry_unsafe: % expired reservation(s) already produced a media row', leaked;
  END IF;
  SELECT indexdef INTO index_def FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'media_key_reservations_object_key_unique';
  IF index_def IS NULL OR index_def NOT ILIKE '%WHERE%' THEN
    RAISE EXCEPTION 'reservation_expiry_incomplete: the object key index still blocks an expired row';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (189, 'media_reservation_expiry', 'sha256:10e7e403a200f46e0d8f5c4698d1f62daf654cb740f7290ed4eb62bc053d7202');
