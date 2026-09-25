-- Purge the residue the hierarchy refactor left behind.
--
-- Four tables still carried rows the refactor made meaningless. Nothing reads
-- them for delivery, so each DELETE is behaviour-neutral; this migration also
-- adds the one sweep rule that stops the worst of them from growing back.
--
-- 1. `litigation_holds`: one row from 2026-09-07 whose own reason reads "uji
--    fungsi hold pasca-migrasi v79 (segera dilepas)" and which was released
--    twenty seconds after it was created. A released rehearsal hold is inert,
--    but a compliance ledger should not carry test rows. Only released holds
--    older than thirty days are removed, so an active freeze can never be
--    deleted by this migration.
-- 2. `cache_bypasses`: 114 rows with `bypass = false`, seeded when the network
--    had 114 sites. `readBypassed()` already treats a missing row as "not
--    bypassed", so these rows carry no information, and the 3224 portals the
--    refactor added have no row at all. The table was left describing a network
--    that no longer exists.
-- 3. `domain_activation_attempts`: one failed attempt from 2026-09-13 whose
--    site is now active and activated. The failure is historical noise; the 68
--    completed attempts for live sites are the real activation trail and stay.
-- 4. `media_key_reservations`: 72 rows marked `used` whose object key never
--    produced a `media` row, so each one claims an upload authorization with no
--    artifact behind it. `retention_sweep` now deletes the same shape after a
--    seven-day grace, because a reservation turns into media within seconds and
--    anything older is a ghost.
--
-- Deliberately kept, with the reason:
--   * `audit_logs` is insert-only, hash-chained, and exported to WORM daily;
--     deleting rows would break the chain and the compliance export.
--   * The 104 `site-logo` and 104 `site-favicon` rows are byte-identical today,
--     but they are the per-brand slots a real asset replaces. Collapsing them
--     would make "replace the logo for this brand only" impossible.
--   * The 37 provinces without portals, the nine archived publisher records,
--     the parked Drill Expire organization, the migration ledger, and the one
--     real user are states, not residue.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DELETE FROM public.litigation_holds
 WHERE released_at IS NOT NULL
   AND created_at < now() - interval '30 days';--> statement-breakpoint
DELETE FROM public.cache_bypasses WHERE NOT bypass;--> statement-breakpoint
DELETE FROM public.domain_activation_attempts AS attempt
 WHERE attempt.status = 'failed'
   AND EXISTS (
     SELECT 1 FROM public.sites AS site
      WHERE site.id = attempt.site_id
        AND site.status = 'active'
        AND site.activation_state = 'active'
   );--> statement-breakpoint
DELETE FROM public.media_key_reservations AS reservation
 WHERE reservation.status = 'used'
   AND reservation.created_at < now() - interval '7 days'
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
     AND reservation.updated_at < now() - interval '7 days'
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
  leftover_holds integer;
  leftover_bypasses integer;
  leftover_failures integer;
  leftover_ghosts integer;
  settings_without_site integer;
  sites_without_settings integer;
  dangling_media integer;
  broken_chains integer;
BEGIN
  SELECT count(*) INTO leftover_holds FROM public.litigation_holds
   WHERE released_at IS NOT NULL AND created_at < now() - interval '30 days';
  IF leftover_holds > 0 THEN
    RAISE EXCEPTION 'refactor_residue_left: % released litigation hold(s) older than 30 days', leftover_holds;
  END IF;
  SELECT count(*) INTO leftover_bypasses FROM public.cache_bypasses WHERE NOT bypass;
  IF leftover_bypasses > 0 THEN
    RAISE EXCEPTION 'refactor_residue_left: % inert cache bypass row(s)', leftover_bypasses;
  END IF;
  SELECT count(*) INTO leftover_failures
    FROM public.domain_activation_attempts AS attempt
    JOIN public.sites AS site ON site.id = attempt.site_id
   WHERE attempt.status = 'failed' AND site.status = 'active' AND site.activation_state = 'active';
  IF leftover_failures > 0 THEN
    RAISE EXCEPTION 'refactor_residue_left: % failed activation attempt(s) for a live portal', leftover_failures;
  END IF;
  SELECT count(*) INTO leftover_ghosts
    FROM public.media_key_reservations AS reservation
   WHERE reservation.status = 'used'
     AND reservation.updated_at < now() - interval '7 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.media AS asset
        WHERE asset.organization_id = reservation.organization_id
          AND asset.object_key = reservation.object_key
     );
  IF leftover_ghosts > 0 THEN
    RAISE EXCEPTION 'refactor_residue_left: % used reservation(s) without a media row', leftover_ghosts;
  END IF;
  SELECT count(*) INTO sites_without_settings FROM public.sites AS site
   WHERE NOT EXISTS (SELECT 1 FROM public.site_settings AS settings
                      WHERE settings.organization_id = site.organization_id AND settings.site_id = site.id);
  SELECT count(*) INTO settings_without_site FROM public.site_settings AS settings
   WHERE NOT EXISTS (SELECT 1 FROM public.sites AS site
                      WHERE site.id = settings.site_id AND site.organization_id = settings.organization_id);
  IF sites_without_settings > 0 OR settings_without_site > 0 THEN
    RAISE EXCEPTION 'refactor_residue_broke_portals: % site(s) without settings, % setting(s) without a site',
      sites_without_settings, settings_without_site;
  END IF;
  SELECT count(*) INTO dangling_media FROM public.site_settings AS settings
   WHERE (settings.default_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.media AS asset WHERE asset.id = settings.default_media_id))
      OR (settings.logo_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.media AS asset WHERE asset.id = settings.logo_media_id))
      OR (settings.favicon_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.media AS asset WHERE asset.id = settings.favicon_media_id));
  IF dangling_media > 0 THEN
    RAISE EXCEPTION 'refactor_residue_broke_portals: % site setting(s) point at a missing asset', dangling_media;
  END IF;
  SELECT count(*) INTO broken_chains FROM public.sites AS site
   WHERE site.parent_site_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.sites AS parent
                      WHERE parent.id = site.parent_site_id
                        AND parent.organization_id = site.organization_id
                        AND parent.domain_id = site.domain_id);
  IF broken_chains > 0 THEN
    RAISE EXCEPTION 'refactor_residue_broke_portals: % derived portal(s) lost their parent', broken_chains;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (190, 'refactor_residue_cleanup', 'sha256:3d91f78a7de2dc76ab00e409ed32756567762dfa3fa5e77f99a491fcb1f0d1dd');
