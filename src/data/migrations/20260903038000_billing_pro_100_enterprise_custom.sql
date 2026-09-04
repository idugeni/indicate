-- F2-DB: Pro menjadi 100 domain @ Rp550rb; Enterprise custom.
--
-- starter (5/99rb) dan growth (20/249rb) tidak berubah. Pro naik ke
-- 100/100/10/30 @ Rp550rb. Enterprise tanpa harga tetap (price 0 = custom,
-- wajib lewat lead + peninjauan); order paket enterprise langsung ditolak
-- di billing_order_create.

UPDATE public.plan_quotas SET max_domains = 100, max_sites = 100, max_members = 10, max_api_keys = 30 WHERE plan = 'pro';--> statement-breakpoint
UPDATE public.packages SET price_idr = 550000, max_domains = 100, max_sites = 100, max_members = 10, max_api_keys = 30, updated_at = now() WHERE plan = 'pro';--> statement-breakpoint
UPDATE public.packages SET price_idr = 0, max_domains = 100, max_sites = 100, max_members = 10, max_api_keys = 30, updated_at = now() WHERE plan = 'enterprise';--> statement-breakpoint
UPDATE public.service_tiers SET price = 'Rp550.000', target = 'Tim kecil — hingga 100 domain & situs', summary = 'Untuk redaksi bertim dengan banyak kanal.', features = '["100 domain & 100 situs", "10 anggota tim", "30 API key", "Prioritas purge cache Cloudflare"]', highlighted = true, cta = 'Bayar & Aktifkan', updated_at = now() WHERE slug = 'pro';--> statement-breakpoint
UPDATE public.service_tiers SET price = 'Kustom', target = 'Kebutuhan khusus — hubungi tim penjualan', summary = 'Cakupan dan harga disusun bersama kebutuhan Anda.', features = '["Kuota sesuai kesepakatan", "Onboarding terjadwal", "Dukungan migrasi data massal", "Manajer akun khusus"]', highlighted = false, cta = 'Hubungi Tim Penjualan', updated_at = now() WHERE slug = 'enterprise';--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_now timestamp with time zone)
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
  INSERT INTO public.orders(id, user_id, org_id, package_id, status, created_at, updated_at) VALUES (v_order, p_actor_id, p_org_id, p_package_id, 'pending_payment', p_now, p_now);
  SELECT COALESCE(p_org_id, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.create', 'order', v_order::text, 'succeeded', ARRAY['package','status'], jsonb_build_object('packageId', p_package_id, 'status', 'pending_payment'), p_request_id, p_now);
  END IF;
  RETURN v_order;
END
$function$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (54, 'billing_pro_100_enterprise_custom', 'sha256:9e50b43e2e74ed57e1c0c9a943415e6dbcd473bbeea392d1f2579f2cd9b06fe4');
