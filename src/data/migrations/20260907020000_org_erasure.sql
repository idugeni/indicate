-- F80: erasure organisasi penuh + worker (PENDING A1).
--
-- 1. Tabel org_erasure_requests: antrean penghapusan operasional per organisasi.
--    Function-only: RLS enabled+forced, tanpa grant ke indicate_runtime.
-- 2. erasure_sweep(): klaim request jatuh tempo (SKIP LOCKED), lewati org yang
--    di-hold (jadwal ulang +24 jam), tolak org platform, lalu hapus operasional
--    dalam urutan aman-FK dalam satu transaksi atomik:
--    - PII anggota dianonimkan (bukan dihapus: memberships RESTRICT users)
--    - objek R2 media diantrekan ke object_cleanup_tasks (alasan org-erasure)
--    - arsip legal dipertahankan: organizations (menjadi archived), subscriptions
--      (menjadi cancelled), audit_logs, invoices, orders, retention_runs, holds
--    - bukti: retention_runs kategori org_erasure + audit org.erasure.
--    Backup terkelola berotasi keluar menurut siklus platform (tanpa restore
--    selektif); fakta ini dicatat dalam proof JSON setiap eksekusi.
-- Dijadwalkan harian via pg_cron (04:00 UTC).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TABLE public.org_erasure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by text NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_for timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NULL,
  proof jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX org_erasure_requests_due_idx ON public.org_erasure_requests (status, next_attempt_at);--> statement-breakpoint
ALTER TABLE public.org_erasure_requests ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.org_erasure_requests FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.erasure_request_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_reason text, p_scheduled_for timestamp with time zone, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF indicate_private.is_platform_organization(p_organization_id) THEN
    RAISE EXCEPTION 'platform organization is not erasable' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'erasure reason invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.org_erasure_requests(id, organization_id, requested_by, reason, status, scheduled_for, next_attempt_at, created_at)
  VALUES (v_id, p_organization_id, p_actor_id::text, p_reason, 'pending', p_scheduled_for, least(p_scheduled_for, p_now), p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'org.erasure.request', 'org_erasure_request', v_id::text, 'succeeded', ARRAY['reason','scheduledFor'], jsonb_build_object('reason', p_reason, 'scheduledFor', p_scheduled_for), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.erasure_request_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, requested_by text, reason text, status text, scheduled_for timestamp with time zone, attempts integer, completed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT r.id, r.organization_id, r.requested_by, r.reason, r.status, r.scheduled_for, r.attempts, r.completed_at, r.created_at
  FROM public.org_erasure_requests r ORDER BY r.created_at DESC;
END
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
      DELETE FROM public.telegram_conversations WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('telegram_conversations', v_n);
      DELETE FROM public.telegram_identity_mappings WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('telegram_mappings', v_n);
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
END
$function$;--> statement-breakpoint
SELECT cron.schedule('indicate-org-erasure', '0 4 * * *', 'SELECT indicate_private.erasure_sweep()');--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (80, 'org_erasure', 'sha256:36c1c49eb990f3e1d53c96c12376153e3679a29b78e5f5e7c67464c9e2741808');
