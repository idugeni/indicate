-- Remove the Telegram integration surfaces (bot webhook, owner Mini App,
-- identity mappings, conversations, outbox).
--
-- Forward-only drop: the single live mapping row and tombstones go with the
-- tables. Audit history keeps its `telegram` enum labels (historical rows
-- must never be rewritten). `retention_sweep` is restated without the two
-- Telegram categories; everything else is byte-identical to v135.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DROP TRIGGER IF EXISTS membership_telegram_mapping_guard ON public.memberships;--> statement-breakpoint
DROP TRIGGER IF EXISTS telegram_mapping_membership_role_guard ON public.telegram_identity_mappings;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.enforce_membership_telegram_coherence();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.enforce_telegram_membership_role();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.resolve_telegram_identity(text, text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.list_telegram_identities(text, text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.outbox_enqueue(uuid, text, text, timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.outbox_claim(timestamptz, integer);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.outbox_ack(uuid, boolean, integer, text, timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.outbox_broadcast_targets(uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.outbox_list_platform(uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.outbox_list(uuid, uuid);--> statement-breakpoint
DROP TABLE IF EXISTS public.telegram_conversations;--> statement-breakpoint
DROP TABLE IF EXISTS public.telegram_outbox;--> statement-breakpoint
DROP TABLE IF EXISTS public.telegram_identity_mappings;--> statement-breakpoint
DROP TYPE IF EXISTS public.telegram_conversation_step;--> statement-breakpoint
DELETE FROM public.role_permissions WHERE permission_id IN (SELECT id FROM public.permissions WHERE name = 'telegram.manage');--> statement-breakpoint
DELETE FROM public.permissions WHERE name = 'telegram.manage';--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.actor_has_tenant_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    NOT EXISTS (
      SELECT 1 FROM public.memberships AS m
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
    )
    OR (SELECT indicate_private.permission_has_platform_admin((SELECT indicate_private.current_verified_user_id())))
    OR (SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), p_permission))
    OR EXISTS (
      SELECT 1
      FROM public.memberships AS m
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
        AND m.user_id = (SELECT indicate_private.current_verified_user_id())
        AND m.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    )
    OR EXISTS (
      SELECT 1 FROM public.api_keys AS k
      WHERE k.organization_id = (SELECT indicate_private.current_organization_id())
        AND k.id::text = current_setting('app.actor_id', true)
        AND k.status = 'active'
        AND (k.expires_at IS NULL OR k.expires_at > now())
        AND k.scopes @> ARRAY[p_permission]
    ),
    false)
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.erasure_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE
  v_req RECORD; v_org uuid; v_n integer; v_total integer := 0;
  v_counts jsonb := '{}'::jsonb; v_started timestamptz := now();
BEGIN
  FOR v_req IN SELECT * FROM public.org_erasure_requests
    WHERE status IN ('pending', 'processing') AND next_attempt_at <= now()
    ORDER BY next_attempt_at, id FOR UPDATE SKIP LOCKED LIMIT 5
  LOOP
    v_org := v_req.organization_id;
    UPDATE public.org_erasure_requests SET status = 'processing', attempts = attempts + 1 WHERE id = v_req.id;
    IF indicate_private.is_platform_organization(v_org) THEN
      UPDATE public.org_erasure_requests SET status = 'failed', completed_at = now(), proof = jsonb_build_object('error', 'platform organization is not erasable') WHERE id = v_req.id;
      CONTINUE;
    END IF;
    IF indicate_private.is_org_held(v_org) THEN
      UPDATE public.org_erasure_requests SET status = 'pending', next_attempt_at = now() + interval '24 hours', proof = jsonb_build_object('waiting', 'litigation_hold') WHERE id = v_req.id;
      CONTINUE;
    END IF;
    BEGIN
      v_counts := '{}'::jsonb;
      INSERT INTO public.object_cleanup_tasks(organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at)
      SELECT v_org, gen_random_uuid(), object_key, 'org-erasure', 'pending', 0, now(), now(), now() FROM public.media WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('r2_queued', v_n);
      INSERT INTO public.object_cleanup_tasks(organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at)
      SELECT v_org, gen_random_uuid(), thumb_object_key, 'org-erasure', 'pending', 0, now(), now(), now() FROM public.media WHERE organization_id = v_org AND thumb_object_key IS NOT NULL;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('r2_thumbs_queued', v_n);
      UPDATE public.users SET display_name = 'Pengguna Dihapus', email = NULL, avatar_url = NULL, bio = NULL, updated_at = now()
      WHERE id IN (SELECT user_id FROM public.memberships WHERE organization_id = v_org);
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('users_anonymized', v_n);
      DELETE FROM public.article_sites WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('article_sites', v_n);
      DELETE FROM public.publication_transition_receipts WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('transition_receipts', v_n);
      DELETE FROM public.publishing_job_targets WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('job_targets', v_n);
      DELETE FROM public.publishing_jobs WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('jobs', v_n);
      DELETE FROM public.content_reports WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('content_reports', v_n);
      DELETE FROM public.privacy_requests WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('privacy_requests', v_n);
      DELETE FROM public.webhook_replay_claims WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('replay_claims', v_n);
      DELETE FROM public.invalidation_tasks WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('invalidation_tasks', v_n);
      DELETE FROM public.domain_activation_attempts WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('activation_attempts', v_n);
      DELETE FROM public.cache_bypasses WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cache_bypasses', v_n);
      DELETE FROM public.media_key_reservations WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('media_reservations', v_n);
      DELETE FROM public.object_cleanup_tasks WHERE organization_id = v_org AND reason <> 'org-erasure';
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cleanup_tasks_old', v_n);
      DELETE FROM public.org_invitations WHERE org_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('invitations', v_n);
      DELETE FROM public.api_keys WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('api_keys', v_n);
      DELETE FROM public.site_settings WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('site_settings', v_n);
      DELETE FROM public.media WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('media', v_n);
      DELETE FROM public.articles WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('articles', v_n);
      DELETE FROM public.authors WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('authors', v_n);
      DELETE FROM public.categories WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('categories', v_n);
      DELETE FROM public.official_affiliations WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('affiliations', v_n);
      DELETE FROM public.publishers WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('publishers', v_n);
      DELETE FROM public.memberships WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('memberships', v_n);
      DELETE FROM public.role_permissions WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('role_permissions', v_n);
      DELETE FROM public.roles WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('roles', v_n);
      DELETE FROM public.permissions WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('permissions', v_n);
      DELETE FROM public.sites WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('sites', v_n);
      DELETE FROM public.domains WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('domains', v_n);
      DELETE FROM public.regions WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('regions', v_n);
      DELETE FROM public.seed_runs WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('seed_runs', v_n);
      UPDATE public.organizations SET status = 'archived', version = version + 1, updated_at = now() WHERE id = v_org;
      UPDATE public.subscriptions SET status = 'cancelled', version = version + 1, updated_at = now() WHERE organization_id = v_org;
      v_counts := v_counts || jsonb_build_object('backups', 'rotasi keluar menurut siklus platform; tanpa restore selektif');
      INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at, organization_id) VALUES ('org_erasure', 1, v_started, now(), v_org);
      INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
      VALUES (v_org, gen_random_uuid(), 'system', 'erasure-sweeper', 'worker', 'org.erasure', 'organization', v_org::text, 'succeeded', ARRAY['status'], v_counts, 'erasure-sweep', now());
      UPDATE public.org_erasure_requests SET status = 'completed', completed_at = now(), proof = v_counts WHERE id = v_req.id;
      v_total := v_total + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.org_erasure_requests SET status = 'failed', completed_at = now(), proof = jsonb_build_object('error', SQLERRM) WHERE id = v_req.id;
    END;
  END LOOP;
  RETURN v_total;
END;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.retention_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
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
  RETURN v_total;
END
$function$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (164, 'telegram_removal', 'sha256:9c8570433fae0b5e8c8e9bc995367668c3f268492457c56bcaadb94c64543798');
