-- Qualify `public.users.id` in the two moderation readers that declare an
-- `id` output column. PL/pgSQL turns each RETURNS TABLE column into a
-- variable, so the unqualified `WHERE id = p_actor_id` guard resolved against
-- both the output variable and the table column and failed with
-- `42702 column reference "id" is ambiguous`. Both readers therefore raised on
-- every call, which surfaced as `503 Moderation is temporarily unavailable` for
-- the content-report and privacy-ticket queues.
CREATE OR REPLACE FUNCTION indicate_private.content_report_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, org_id uuid, site_id uuid, article_id uuid, reporter_contact text, reason_category text, details text, article_url text, status report_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_actor_id AND u.status = 'active') THEN
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

CREATE OR REPLACE FUNCTION indicate_private.privacy_request_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, ticket_number text, org_id uuid, request_type privacy_request_type, details text, status privacy_request_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_actor_id AND u.status = 'active') THEN
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
