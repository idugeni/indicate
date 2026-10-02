-- Dashboard list pagination: bounded, cursor-stable reads for the platform
-- admin queues that previously returned every matching row.
--
-- Each *_list SECURITY DEFINER function now accepts optional p_limit /
-- p_cursor_created_at / p_cursor_id parameters. Without arguments the
-- behaviour is bounded to the first p_limit (default 100) rows ordered by
-- created_at DESC, id DESC, so callers skip the hard LIMIT without page
-- information still cannot truncate silently. Cursor is the (created_at, id)
-- pair of the last row from the previous page: rows strictly older than the
-- cursor (or equal in created_at and smaller in id) come back next.
-- Ordering becomes strictly (created_at DESC, id DESC); invoice_list_for_org
-- previously led with paid_at DESC NULLS FIRST. Paid recency is still
-- available by filtering the created page, and the composite order removes
-- the unstable NULL boundary on paid_at.

DROP FUNCTION IF EXISTS indicate_private.content_report_list(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.content_report_list(p_actor_id uuid, p_limit integer DEFAULT 100, p_cursor_created_at timestamp with time zone DEFAULT NULL, p_cursor_id uuid DEFAULT NULL)
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
    FROM public.content_reports r
    WHERE p_cursor_created_at IS NULL OR r.created_at < p_cursor_created_at OR (r.created_at = p_cursor_created_at AND r.id < p_cursor_id)
    ORDER BY r.created_at DESC, r.id DESC LIMIT p_limit;
  ELSE
    RETURN QUERY SELECT r.id, r.organization_id, r.site_id, r.article_id, r.reporter_contact, r.reason_category, r.details, r.article_url, r.status, r.created_at
    FROM public.content_reports r JOIN public.memberships m ON m.organization_id = r.organization_id
    WHERE m.user_id = p_actor_id AND m.status = 'active'
      AND (p_cursor_created_at IS NULL OR r.created_at < p_cursor_created_at OR (r.created_at = p_cursor_created_at AND r.id < p_cursor_id))
    ORDER BY r.created_at DESC, r.id DESC LIMIT p_limit;
  END IF;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.content_report_list(uuid, integer, timestamp with time zone, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.content_report_list(uuid, integer, timestamp with time zone, uuid) TO indicate_runtime;--> statement-breakpoint

DROP FUNCTION IF EXISTS indicate_private.privacy_request_list(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.privacy_request_list(p_actor_id uuid, p_limit integer DEFAULT 100, p_cursor_created_at timestamp with time zone DEFAULT NULL, p_cursor_id uuid DEFAULT NULL)
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
    FROM public.privacy_requests r
    WHERE p_cursor_created_at IS NULL OR r.created_at < p_cursor_created_at OR (r.created_at = p_cursor_created_at AND r.id < p_cursor_id)
    ORDER BY r.created_at DESC, r.id DESC LIMIT p_limit;
  ELSE
    RETURN QUERY SELECT r.id, r.ticket_number, r.organization_id, r.request_type, r.details, r.status, r.created_at
    FROM public.privacy_requests r JOIN public.memberships m ON m.organization_id = r.organization_id
    WHERE m.user_id = p_actor_id AND m.status = 'active'
      AND (p_cursor_created_at IS NULL OR r.created_at < p_cursor_created_at OR (r.created_at = p_cursor_created_at AND r.id < p_cursor_id))
    ORDER BY r.created_at DESC, r.id DESC LIMIT p_limit;
  END IF;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.privacy_request_list(uuid, integer, timestamp with time zone, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.privacy_request_list(uuid, integer, timestamp with time zone, uuid) TO indicate_runtime;--> statement-breakpoint

DROP FUNCTION IF EXISTS indicate_private.hold_list(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.hold_list(p_actor_id uuid, p_limit integer DEFAULT 100, p_cursor_created_at timestamp with time zone DEFAULT NULL, p_cursor_id uuid DEFAULT NULL)
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
  FROM public.litigation_holds h
  WHERE p_cursor_created_at IS NULL OR h.created_at < p_cursor_created_at OR (h.created_at = p_cursor_created_at AND h.id < p_cursor_id)
  ORDER BY h.created_at DESC, h.id DESC LIMIT p_limit;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.hold_list(uuid, integer, timestamp with time zone, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.hold_list(uuid, integer, timestamp with time zone, uuid) TO indicate_runtime;--> statement-breakpoint

DROP FUNCTION IF EXISTS indicate_private.erasure_request_list(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.erasure_request_list(p_actor_id uuid, p_limit integer DEFAULT 100, p_cursor_created_at timestamp with time zone DEFAULT NULL, p_cursor_id uuid DEFAULT NULL)
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
  FROM public.org_erasure_requests r
  WHERE p_cursor_created_at IS NULL OR r.created_at < p_cursor_created_at OR (r.created_at = p_cursor_created_at AND r.id < p_cursor_id)
  ORDER BY r.created_at DESC, r.id DESC LIMIT p_limit;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.erasure_request_list(uuid, integer, timestamp with time zone, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.erasure_request_list(uuid, integer, timestamp with time zone, uuid) TO indicate_runtime;--> statement-breakpoint

DROP FUNCTION IF EXISTS indicate_private.customer_list(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.customer_list(p_actor_id uuid, p_limit integer DEFAULT 100, p_cursor_created_at timestamp with time zone DEFAULT NULL, p_cursor_id uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, name text, slug text, status record_status, customer_metadata jsonb, version integer, created_at timestamp with time zone, updated_at timestamp with time zone, subscription_status subscription_status, subscription_version integer, subscription_created_at timestamp with time zone, subscription_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.status, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  WHERE p_cursor_created_at IS NULL OR o.created_at < p_cursor_created_at OR (o.created_at = p_cursor_created_at AND o.id < p_cursor_id)
  ORDER BY o.created_at DESC, o.id DESC LIMIT p_limit;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_list(uuid, integer, timestamp with time zone, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(uuid, integer, timestamp with time zone, uuid) TO indicate_runtime;--> statement-breakpoint

DROP FUNCTION IF EXISTS indicate_private.invoice_list_for_org(uuid, uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid, p_limit integer DEFAULT 100, p_cursor_created_at timestamp with time zone DEFAULT NULL, p_cursor_id uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, organization_id uuid, organization_name text, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, due_at timestamp with time zone, billing_note text, payment_method text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, o.name, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.due_at, i.billing_note, i.payment_method, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.organization_id = p_organization_id
    AND (p_cursor_created_at IS NULL OR i.created_at < p_cursor_created_at OR (i.created_at = p_cursor_created_at AND i.id < p_cursor_id))
  ORDER BY i.created_at DESC, i.id DESC LIMIT p_limit;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid, integer, timestamp with time zone, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid, integer, timestamp with time zone, uuid) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (243, 'dashboard_list_pagination', 'sha256:19e96dd45ee3728bdd787ffdfa4fb79d2b5e54f9d4ed8696957c3de2f502f05b');
