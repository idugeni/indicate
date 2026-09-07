-- F79: litigation hold formal (PENDING A4).
--
-- 1. Tabel litigation_holds: satu hold aktif per organisasi (unique partial).
--    Function-only: RLS enabled+forced, tanpa grant ke indicate_runtime;
--    dikelola lewat fungsi SECURITY DEFINER ber-gate platform admin.
-- 2. retention_sweep dinyatakan ulang dengan guard hold: baris milik organisasi
--    yang sedang di-hold tidak disapu sampai hold dilepas.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TABLE public.litigation_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 2000),
  held_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  released_at timestamp with time zone NULL,
  released_by text NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX litigation_holds_active_org_unique ON public.litigation_holds (organization_id) WHERE released_at IS NULL;--> statement-breakpoint
ALTER TABLE public.litigation_holds ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.litigation_holds FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.is_org_held(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.litigation_holds WHERE organization_id = p_organization_id AND released_at IS NULL)
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.hold_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_reason text, p_now timestamp with time zone)
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
  IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'hold reason invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.litigation_holds(id, organization_id, reason, held_by, created_at)
  VALUES (v_id, p_organization_id, p_reason, p_actor_id::text, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'legal.hold.create', 'litigation_hold', v_id::text, 'succeeded', ARRAY['reason'], jsonb_build_object('reason', p_reason), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.hold_release(p_actor_id uuid, p_request_id text, p_hold_id uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.litigation_holds SET released_at = p_now, released_by = p_actor_id::text
  WHERE id = p_hold_id AND released_at IS NULL RETURNING organization_id INTO v_org;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'legal.hold.release', 'litigation_hold', p_hold_id::text, 'succeeded', ARRAY['releasedAt'], jsonb_build_object('releasedAt', p_now), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.hold_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, reason text, held_by text, created_at timestamp with time zone, released_at timestamp with time zone, released_by text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT h.id, h.organization_id, h.reason, h.held_by, h.created_at, h.released_at, h.released_by
  FROM public.litigation_holds h ORDER BY h.created_at DESC;
END
$function$;--> statement-breakpoint
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
  DELETE FROM public.telegram_conversations WHERE expires_at < now() AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('telegram_conversations', v_count, v_started, now());
  v_total := v_total + v_count;
  RETURN v_total;
END
$function$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (79, 'litigation_holds', 'sha256:5556c07d527e7dc89eae5a2b3e0174ba5be77ed5b2d65a9a19a07d4691893df1');
