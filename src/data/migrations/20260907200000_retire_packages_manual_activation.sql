-- Pensiun paket: aktivasi manual tanpa tier, harga, order, atau periode.
--
-- Model baru: subscription hanya status (active/suspended/cancelled) tanpa
-- plan dan tanpa rentang waktu; org aktif berjalan terus. Pembelian lewat
-- kontak owner; owner mengaktifkan via UI superadmin. Invite member bukan
-- bagian billing dan dipertahankan (tanpa cek kuota).
--
-- Tanpa migrasi ini, sweep malam hari akan men-suspend 59 org pro/active
-- tepat saat period 30 hari berakhir. Urutan penting: fungsi dulu (agar
-- tidak ada referensi ke kolom/tipe yang di-drop), lalu tabel, kolom, tipe.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
SELECT cron.unschedule('indicate-subscription-sweep');--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.subscription_sweep_expired();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_create(uuid, text, uuid, uuid, text, timestamp with time zone);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamp with time zone);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_submit_proof(uuid, text, uuid, text, timestamp with time zone);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_decide(uuid, text, uuid, boolean, uuid, timestamp with time zone);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_mine(uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_pending(uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_active(uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_order_refund(uuid, text, uuid, timestamp with time zone);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_lead_create(text, text, text, timestamp with time zone, text, text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_lead_list(uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.invoice_list(uuid);--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invite_redeem(p_actor_id uuid, p_request_id text, p_token_hash text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_inv public.org_invitations%ROWTYPE; v_email text;
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = p_actor_id AND status = 'active';
  IF v_email IS NULL THEN RAISE EXCEPTION 'active user required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_inv FROM public.org_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF v_inv.id IS NULL OR v_inv.accepted_at IS NOT NULL OR v_inv.expires_at <= p_now THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  IF lower(v_email) <> lower(v_inv.email) THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.memberships(organization_id, user_id, role_id, status, version, created_at, updated_at)
  VALUES (v_inv.org_id, p_actor_id, v_inv.role_id, 'active', 1, p_now, p_now)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', version = public.memberships.version + 1, updated_at = EXCLUDED.updated_at;
  UPDATE public.org_invitations SET accepted_at = p_now, updated_at = p_now WHERE id = v_inv.id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_inv.org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.redeem', 'membership', p_actor_id::text, 'succeeded', ARRAY['roleId','status'], jsonb_build_object('roleId', v_inv.role_id), p_request_id, p_now);
  RETURN v_inv.org_id;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.subscription_access_state(p_organization_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT CASE
    WHEN indicate_private.is_platform_organization(p_organization_id) THEN 'platform'
    WHEN s.organization_id IS NULL THEN 'none'
    WHEN s.status = 'cancelled' THEN 'cancelled'
    WHEN s.status = 'suspended' THEN 'suspended'
    ELSE 'active'
  END
  FROM (SELECT p_organization_id AS organization_id) AS input
  LEFT JOIN public.subscriptions AS s ON s.organization_id = input.organization_id
$function$;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamp with time zone, timestamp with time zone, timestamp with time zone);--> statement-breakpoint
CREATE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_status subscription_status, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, status, version, created_at, updated_at)
    VALUES (p_organization_id, p_status, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET status = p_status, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', p_status), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz) TO indicate_runtime;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, jsonb, timestamp with time zone);--> statement-breakpoint
CREATE FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_status subscription_status, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
  VALUES (p_organization_id, p_name, p_slug, 'active', p_metadata, 1, p_now, p_now);
  PERFORM indicate_private.org_ensure_permissions(p_organization_id);
  INSERT INTO public.subscriptions(organization_id, status, version, created_at, updated_at)
  VALUES (p_organization_id, p_status, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, subscription_status, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, subscription_status, timestamptz) TO indicate_runtime;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.customer_list(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.customer_list(p_actor_id uuid)
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
  ORDER BY o.name, o.id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(uuid) TO indicate_runtime;--> statement-breakpoint
DROP TABLE IF EXISTS public.invoices;--> statement-breakpoint
DROP TABLE IF EXISTS public.orders;--> statement-breakpoint
DROP TABLE IF EXISTS public.enterprise_leads;--> statement-breakpoint
DROP TABLE IF EXISTS public.packages;--> statement-breakpoint
DROP TABLE IF EXISTS public.plan_quotas;--> statement-breakpoint
DROP TABLE IF EXISTS public.service_tiers;--> statement-breakpoint
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS plan;--> statement-breakpoint
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS period_starts_at;--> statement-breakpoint
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS period_ends_at;--> statement-breakpoint
DROP TYPE IF EXISTS public.subscription_plan;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (97, 'retire_packages_manual_activation', 'sha256:d18af1ba11932a7a0661dbb7d3c55c4d0482cae2751bb7c61bfdccbf07aaa1b8');

