-- Fase D legal-hardening: laporan konten publik + tiket DSAR + lisensi media.
--
-- content_reports menampung laporan publik per artikel (UU ITE/PP PSTE:
-- bukti penerimaan + penanganan). Penegakan memakai alur unpublish yang
-- sudah ada; status laporan melacak workflow hukumnya. privacy_requests
-- adalah tiket DSAR bernomor (UU PDP Ps.8/16) dengan SLA yang bisa diaudit.
-- Kolom lisensi media menegakkan kewajiban atribusi (UU Hak Cipta).
-- Semua tulis/baca lewat fungsi SECURITY DEFINER di bawah; tabel
-- function-only (default-deny + FORCE RLS) mengikuti preseden
-- enterprise_leads.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE TYPE public.report_status AS ENUM ('received', 'under_review', 'action_taken', 'rejected');--> statement-breakpoint
CREATE TYPE public.privacy_request_type AS ENUM ('access', 'correction', 'deletion', 'portability', 'restriction');--> statement-breakpoint
CREATE TYPE public.privacy_request_status AS ENUM ('open', 'in_progress', 'fulfilled', 'rejected');--> statement-breakpoint

CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE restrict,
  site_id uuid,
  article_id uuid,
  reporter_contact text NOT NULL,
  reason_category text NOT NULL,
  details text NOT NULL,
  article_url text,
  status public.report_status NOT NULL DEFAULT 'received',
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_contact_bounded CHECK (length(reporter_contact) BETWEEN 3 AND 320),
  CONSTRAINT content_reports_category_values CHECK (reason_category IN ('copyright', 'defamation', 'privacy', 'hate', 'misinformation', 'other')),
  CONSTRAINT content_reports_details_bounded CHECK (length(details) BETWEEN 10 AND 4000),
  CONSTRAINT content_reports_url_bounded CHECK (article_url IS NULL OR length(article_url) BETWEEN 8 AND 2000),
  CONSTRAINT content_reports_note_bounded CHECK (decision_note IS NULL OR length(decision_note) BETWEEN 1 AND 2000),
  CONSTRAINT content_reports_site_fk FOREIGN KEY (organization_id, site_id) REFERENCES public.sites(organization_id, id) ON DELETE restrict,
  CONSTRAINT content_reports_article_fk FOREIGN KEY (organization_id, article_id) REFERENCES public.articles(organization_id, id) ON DELETE restrict
);--> statement-breakpoint
CREATE INDEX content_reports_org_status_idx ON public.content_reports USING btree (organization_id, status);--> statement-breakpoint
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.content_reports FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS reports_function_only ON public.content_reports;--> statement-breakpoint
CREATE POLICY reports_function_only ON public.content_reports FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
REVOKE ALL ON public.content_reports FROM PUBLIC;--> statement-breakpoint

CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE restrict,
  requester_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE restrict,
  request_type public.privacy_request_type NOT NULL,
  details text NOT NULL,
  status public.privacy_request_status NOT NULL DEFAULT 'open',
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT privacy_requests_details_bounded CHECK (length(details) BETWEEN 10 AND 4000),
  CONSTRAINT privacy_requests_note_bounded CHECK (decision_note IS NULL OR length(decision_note) BETWEEN 1 AND 2000)
);--> statement-breakpoint
CREATE INDEX privacy_requests_org_status_idx ON public.privacy_requests USING btree (organization_id, status);--> statement-breakpoint
CREATE INDEX privacy_requests_ticket_idx ON public.privacy_requests USING btree (ticket_number);--> statement-breakpoint
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.privacy_requests FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS privacy_requests_function_only ON public.privacy_requests;--> statement-breakpoint
CREATE POLICY privacy_requests_function_only ON public.privacy_requests FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
REVOKE ALL ON public.privacy_requests FROM PUBLIC;--> statement-breakpoint

ALTER TABLE public.media ADD COLUMN IF NOT EXISTS license_source text;--> statement-breakpoint
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS attribution text;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_license_bounded') THEN
    ALTER TABLE public.media ADD CONSTRAINT media_license_bounded CHECK (license_source IS NULL OR length(license_source) BETWEEN 1 AND 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_attribution_bounded') THEN
    ALTER TABLE public.media ADD CONSTRAINT media_attribution_bounded CHECK (attribution IS NULL OR length(attribution) BETWEEN 1 AND 500);
  END IF;
END
$$;--> statement-breakpoint

-- Laporan publik: tanpa aktor (dilindungi rate-limit di tepi).
CREATE OR REPLACE FUNCTION indicate_private.content_report_submit(p_request_id text, p_org_id uuid, p_site_id uuid, p_article_id uuid, p_contact text, p_category text, p_details text, p_url text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_contact IS NULL OR length(p_contact) NOT BETWEEN 3 AND 320
     OR p_category IS NULL OR p_category NOT IN ('copyright', 'defamation', 'privacy', 'hate', 'misinformation', 'other')
     OR p_details IS NULL OR length(p_details) NOT BETWEEN 10 AND 4000
     OR (p_url IS NOT NULL AND length(p_url) NOT BETWEEN 8 AND 2000) THEN
    RAISE EXCEPTION 'report fields invalid' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'unknown target' USING ERRCODE = '42501';
  END IF;
  IF p_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sites WHERE organization_id = p_org_id AND id = p_site_id) THEN
    RAISE EXCEPTION 'unknown target' USING ERRCODE = '42501';
  END IF;
  IF p_article_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.articles WHERE organization_id = p_org_id AND id = p_article_id) THEN
    RAISE EXCEPTION 'unknown target' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.content_reports(id, organization_id, site_id, article_id, reporter_contact, reason_category, details, article_url, status, created_at, updated_at)
  VALUES (v_id, p_org_id, p_site_id, p_article_id, p_contact, p_category, p_details, p_url, 'received', p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_org_id, gen_random_uuid(), 'system', 'content-report-intake', 'worker', 'content_report.received', 'content_report', v_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'received', 'category', p_category), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.content_report_submit(text, uuid, uuid, uuid, text, text, text, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.content_report_submit(text, uuid, uuid, uuid, text, text, text, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.content_report_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, org_id uuid, site_id uuid, article_id uuid, reporter_contact text, reason_category text, details text, article_url text, status report_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RETURN QUERY SELECT r.id, r.organization_id, r.site_id, r.article_id, r.reporter_contact, r.reason_category, r.details, r.article_url, r.status, r.created_at
    FROM public.content_reports r ORDER BY r.created_at DESC;
  ELSE
    RETURN QUERY SELECT r.id, r.organization_id, r.site_id, r.article_id, r.reporter_contact, r.reason_category, r.details, r.article_url, r.status, r.created_at
    FROM public.content_reports r JOIN public.memberships m ON m.organization_id = r.organization_id
    WHERE m.user_id = p_actor_id AND m.status = 'active' ORDER BY r.created_at DESC;
  END IF;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.content_report_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.content_report_list(uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.content_report_decide(p_actor_id uuid, p_request_id text, p_report_id uuid, p_action_taken boolean, p_note text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  SELECT organization_id INTO v_org FROM public.content_reports WHERE id = p_report_id AND status IN ('received', 'under_review');
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = v_org AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
  END IF;
  IF p_note IS NOT NULL AND length(p_note) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'decision note invalid' USING ERRCODE = '42501';
  END IF;
  UPDATE public.content_reports SET status = CASE WHEN p_action_taken THEN 'action_taken'::report_status ELSE 'rejected'::report_status END, decided_by = p_actor_id, decided_at = p_now, decision_note = p_note, updated_at = p_now WHERE id = p_report_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'content_report.decide', 'content_report', p_report_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('actionTaken', p_action_taken), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.content_report_decide(uuid, text, uuid, boolean, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.content_report_decide(uuid, text, uuid, boolean, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.privacy_request_submit(p_actor_id uuid, p_request_id text, p_org_id uuid, p_type privacy_request_type, p_details text, p_now timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_ticket text; v_tries integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF p_details IS NULL OR length(p_details) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'request fields invalid' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'organization missing' USING ERRCODE = '42501';
  END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_org_id AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
  END IF;
  LOOP
    v_tries := v_tries + 1;
    v_ticket := 'DSAR-' || to_char(p_now, 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 8));
    BEGIN
      INSERT INTO public.privacy_requests(id, ticket_number, organization_id, requester_user_id, request_type, details, status, created_at, updated_at)
      VALUES (v_id, v_ticket, p_org_id, p_actor_id, p_type, p_details, 'open', p_now, p_now);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_tries >= 5 THEN RAISE; END IF;
    END;
  END LOOP;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'privacy_request.submit', 'privacy_request', v_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('ticket', v_ticket, 'type', p_type), p_request_id, p_now);
  RETURN v_ticket;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.privacy_request_submit(uuid, text, uuid, privacy_request_type, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.privacy_request_submit(uuid, text, uuid, privacy_request_type, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.privacy_request_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, ticket_number text, org_id uuid, request_type privacy_request_type, details text, status privacy_request_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RETURN QUERY SELECT r.id, r.ticket_number, r.organization_id, r.request_type, r.details, r.status, r.created_at
    FROM public.privacy_requests r ORDER BY r.created_at DESC;
  ELSE
    RETURN QUERY SELECT r.id, r.ticket_number, r.organization_id, r.request_type, r.details, r.status, r.created_at
    FROM public.privacy_requests r JOIN public.memberships m ON m.organization_id = r.organization_id
    WHERE m.user_id = p_actor_id AND m.status = 'active' ORDER BY r.created_at DESC;
  END IF;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.privacy_request_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.privacy_request_list(uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.privacy_request_decide(p_actor_id uuid, p_request_id text, p_ticket text, p_status privacy_request_status, p_note text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid; v_org uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('in_progress', 'fulfilled', 'rejected') THEN
    RAISE EXCEPTION 'request status invalid' USING ERRCODE = '42501';
  END IF;
  SELECT id, organization_id INTO v_id, v_org FROM public.privacy_requests WHERE ticket_number = p_ticket AND status IN ('open', 'in_progress');
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = v_org AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
  END IF;
  IF p_note IS NOT NULL AND length(p_note) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'decision note invalid' USING ERRCODE = '42501';
  END IF;
  UPDATE public.privacy_requests SET status = p_status, decided_by = p_actor_id, decided_at = p_now, decision_note = p_note, updated_at = p_now WHERE id = v_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'privacy_request.decide', 'privacy_request', v_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', p_status, 'ticket', p_ticket), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.privacy_request_decide(uuid, text, text, privacy_request_status, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.privacy_request_decide(uuid, text, text, privacy_request_status, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (76, 'moderation_reports', 'sha256:97233a17db7c22daa07cdc2ecba39ab6aa382ea09496b97b788f94c9b6541a99');
