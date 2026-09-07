-- Fase B legal-hardening: persistensi clickwrap pada orders.
--
-- Expand-phase: kolom nullable agar order lama (pra-clickwrap, jika ada) tetap
-- terbaca; baris lama yang terms_version-nya NULL berarti persetujuan versi
-- tidak tercatat dan tidak boleh diklaim sebagai bukti persetujuan.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_version text;--> statement-breakpoint
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_terms_version_bounded') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_terms_version_bounded CHECK (terms_version IS NULL OR length(terms_version) BETWEEN 1 AND 32);
  END IF;
END
$$;--> statement-breakpoint

-- Overload 6-arg: satu-satunya jalur pembuatan order yang sah. Menolak versi
-- Terms basi agar bukti persetujuan selalu mengikat versi yang berlaku.
CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_terms_version text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_order uuid := gen_random_uuid(); v_audit_org uuid; v_plan text; v_price integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF p_terms_version IS NULL OR p_terms_version <> '2026-09-05' THEN
    RAISE EXCEPTION 'terms version unsupported' USING ERRCODE = '42501';
  END IF;
  SELECT plan, price_idr INTO v_plan, v_price FROM public.packages WHERE id = p_package_id AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'package unavailable' USING ERRCODE = '42501';
  END IF;
  IF v_plan = 'enterprise' THEN
    RAISE EXCEPTION 'enterprise requires sales review' USING ERRCODE = '42501';
  END IF;
  IF p_org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
      RAISE EXCEPTION 'organization missing' USING ERRCODE = '42501';
    END IF;
    IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
       AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_org_id AND user_id = p_actor_id AND status = 'active') THEN
      RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
    END IF;
  END IF;
  INSERT INTO public.orders(id, user_id, org_id, package_id, status, terms_version, terms_accepted_at, created_at, updated_at)
  VALUES (v_order, p_actor_id, p_org_id, p_package_id, 'pending_payment', p_terms_version, p_now, p_now, p_now);
  SELECT COALESCE(p_org_id, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.create', 'order', v_order::text, 'succeeded', ARRAY['package','status','termsVersion'], jsonb_build_object('packageId', p_package_id, 'status', 'pending_payment', 'termsVersion', p_terms_version), p_request_id, p_now);
  END IF;
  RETURN v_order;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

-- Fail-closed shim: overload 5-arg lama tidak lagi membuat order. Pemanggil
-- basi gagal dengan denial non-disclosing (42501) alih-alih order tanpa bukti
-- persetujuan. Dihapus permanen pada fase contract setelah 1 rilis.
CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RAISE EXCEPTION 'terms consent required' USING ERRCODE = '42501';
  RETURN NULL;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

-- Daftar order milik pemakai kini menyertakan bukti persetujuan.
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_mine(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.billing_order_list_mine(p_actor_id uuid)
 RETURNS TABLE(id uuid, package_name text, plan text, price_idr integer, status billing_order_status, org_id uuid, terms_version text, terms_accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT o.id, p.name, p.plan, p.price_idr, o.status, o.org_id, o.terms_version, o.terms_accepted_at, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id
  WHERE o.user_id = p_actor_id
    AND (o.user_id = indicate_private.current_verified_user_id()
         OR indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id()))
  ORDER BY o.created_at DESC
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_mine(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_mine(uuid) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (68, 'billing_terms_consent', 'sha256:eb33c41de647f29469853ca7aa5fd42671e9a2828f8eaf6ff43974b5bb08918f');
