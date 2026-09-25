-- Retire superseded upload reservations on a realistic clock.
--
-- A media upload is authorized for minutes: the stuck reservation found earlier
-- was created 03:45:33 and expired at 03:55:33 the same minute. A `used`
-- reservation whose object key never produced a `media` row is therefore an
-- abandoned attempt, and the only question is how patient the cleanup should be.
-- Seven days was chosen first and turned out to be longer than the real data
-- needed: 54 reservations from 2026-09-19 still sat inside that window while
-- every one of them targeted an apex portal that already carries both a logo and
-- a favicon, so the upload had plainly been superseded. Three days is roughly
-- four hundred times the authorization window and still leaves no room for a
-- genuine in-flight upload.
--
-- The sweep rule is restated with the same three-day grace so the scheduled job
-- and this migration can never disagree. The guard asserts that no `media` row
-- lost its object key and that the live portal graph is untouched.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DELETE FROM public.media_key_reservations AS reservation
 WHERE reservation.status = 'used'
   AND reservation.updated_at < now() - interval '3 days'
   AND NOT indicate_private.is_org_held(reservation.organization_id)
   AND NOT EXISTS (
     SELECT 1 FROM public.media AS asset
      WHERE asset.organization_id = reservation.organization_id
        AND asset.object_key = reservation.object_key
   );--> statement-breakpoint
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
DO $$
DECLARE
  ghosts integer;
  settings_orphan_media integer;
  portals_without_settings integer;
  index_def text;
BEGIN
  SELECT count(*) INTO ghosts FROM public.media_key_reservations
   WHERE status = 'used'
     AND NOT EXISTS (SELECT 1 FROM public.media AS asset
                      WHERE asset.organization_id = media_key_reservations.organization_id
                        AND asset.object_key = media_key_reservations.object_key);
  IF ghosts > 0 THEN
    RAISE EXCEPTION 'reservation_ghosts_left: % used reservation(s) without a media row', ghosts;
  END IF;
  SELECT count(*) INTO settings_orphan_media FROM public.site_settings AS settings
   WHERE (settings.default_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.media AS asset WHERE asset.id = settings.default_media_id))
      OR (settings.logo_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.media AS asset WHERE asset.id = settings.logo_media_id))
      OR (settings.favicon_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.media AS asset WHERE asset.id = settings.favicon_media_id));
  IF settings_orphan_media > 0 THEN
    RAISE EXCEPTION 'reservation_ghosts_broke_media: % site setting(s) point at a missing asset', settings_orphan_media;
  END IF;
  SELECT count(*) INTO portals_without_settings FROM public.sites AS site
   WHERE NOT EXISTS (SELECT 1 FROM public.site_settings AS settings
                      WHERE settings.organization_id = site.organization_id AND settings.site_id = site.id);
  IF portals_without_settings > 0 THEN
    RAISE EXCEPTION 'reservation_ghosts_broke_portals: % site(s) lost their settings', portals_without_settings;
  END IF;
  SELECT indexdef INTO index_def FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'media_key_reservations_object_key_unique';
  IF index_def IS NULL OR index_def NOT ILIKE '%WHERE%' THEN
    RAISE EXCEPTION 'reservation_ghosts_broke_guard: the object key index is no longer partial';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (194, 'purge_superseded_media_reservations', 'sha256:d4af963f6d9a87235c453cbe2d2207f2ed2aad563a1e7369f6644f7450b8595c');
