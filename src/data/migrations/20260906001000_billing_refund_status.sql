-- Fase B legal-hardening: status refund + fungsi refund order aktif.
--
-- PostgreSQL tidak mengizinkan ALTER TYPE ... ADD VALUE di dalam blok
-- transaksi; terapkan file ini di luar transaksi (psql / SQL editor),
-- mengikuti preseden 20260903041000_publishing_unpublished_state.sql.
-- Refund menandai order 'refunded' beserta audit; penangguhan langganan
-- tetap keputusan operator terpisah via subscription_update (terdokumentasi
-- pada Ketentuan §7) agar tidak ada penonaktifan otomatis yang keliru.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TYPE billing_order_status ADD VALUE IF NOT EXISTS 'refunded';--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_order_refund(p_actor_id uuid, p_request_id text, p_order_id uuid, p_now timestamp with time zone)
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
  SELECT org_id INTO v_org FROM public.orders WHERE id = p_order_id AND status = 'active';
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.orders SET status = 'refunded', decided_by = p_actor_id, decided_at = p_now, updated_at = p_now WHERE id = p_order_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (COALESCE(v_org, (SELECT organization_id FROM public.platform_organizations LIMIT 1)), gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.refund', 'order', p_order_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'refunded', 'refundedFrom', 'active'), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_refund(uuid, text, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_refund(uuid, text, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

-- Daftar order aktif untuk operator platform (pola billing_order_list_pending).
CREATE OR REPLACE FUNCTION indicate_private.billing_order_list_active(p_actor_id uuid)
 RETURNS TABLE(id uuid, user_email text, org_id uuid, package_name text, plan text, price_idr integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, u.email, o.org_id, p.name, p.plan, p.price_idr, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id JOIN public.users u ON u.id = o.user_id
  WHERE o.status = 'active'
  ORDER BY o.created_at DESC;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_active(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_active(uuid) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (69, 'billing_refund_status', 'sha256:510975ca1a4f2a84fca808f7aca50b808f138b61a6e370b8e5676513fd4b50d1');
