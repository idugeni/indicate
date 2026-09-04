-- F2a-DB: billing orders + subscription lockdown + access-state helper.
--
-- Forward-only.
-- 1. `billing_order_status` enum + tabel `packages`, `orders`, `invoices`,
--    `enterprise_leads`, `org_invitations` mengikuti src/database/schema/billing.ts.
--    `packages.plan` dipetakan 1:1 ke `subscription_plan` (starter/growth/pro/
--    enterprise) — tidak ada lagi pemetaan pro -> enterprise.
-- 2. Seed 4 paket jual (harga + kuota cermin plan_quotas). Idempoten via
--    WHERE NOT EXISTS per plan.
-- 3. RLS: packages runtime-read-only (katalog publik dibaca server-side via
--    runtime role). orders/invoices/enterprise_leads/org_invitations default-deny
--    (FORCE RLS, tanpa policy): semua akses lewat fungsi SECURITY DEFINER di bawah.
-- 4. Fungsi: billing_order_create / billing_order_submit_proof /
--    billing_order_decide (approve → upsert subscription active 30 hari + invoice
--    + audit) / billing_order_list_mine / billing_order_list_pending /
--    billing_lead_create. Invitation-redeem menyusul di F2b bersama kode aplikasi.
-- 5. `subscription_update` dikunci: cabang tenant `subscription.manage` dicabut,
--    hanya `permission_has_platform_admin()` yang lolos. Upgrade/downgrade lewat
--    order baru, bukan edit langsung.
-- 6. `subscription_access_state(org)` untuk penegakan masa tenggang di F2b:
--    'platform' (org platform selalu penuh), 'active', 'grace' (tenggang baca-saja
--    7 hari setelah period_ends_at), 'expired', 'suspended', 'cancelled', 'none'.

CREATE TYPE "public"."billing_order_status" AS ENUM('pending_payment', 'waiting_verification', 'active', 'rejected');--> statement-breakpoint
CREATE TABLE "packages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "plan" text NOT NULL,
  "price_idr" integer NOT NULL,
  "max_domains" integer,
  "max_sites" integer,
  "max_members" integer,
  "max_api_keys" integer,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "packages_price_nonnegative" CHECK ("packages"."price_idr" >= 0),
  CONSTRAINT "packages_plan_values" CHECK ("packages"."plan" IN ('starter', 'growth', 'pro', 'enterprise')),
  CONSTRAINT "packages_quota_nonnegative" CHECK (("packages"."max_domains" IS NULL OR "packages"."max_domains" > 0) AND ("packages"."max_sites" IS NULL OR "packages"."max_sites" > 0) AND ("packages"."max_members" IS NULL OR "packages"."max_members" > 0) AND ("packages"."max_api_keys" IS NULL OR "packages"."max_api_keys" > 0))
);--> statement-breakpoint
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE restrict,
  "org_id" uuid REFERENCES "public"."organizations"("id") ON DELETE restrict,
  "package_id" uuid NOT NULL REFERENCES "public"."packages"("id") ON DELETE restrict,
  "status" "public"."billing_order_status" DEFAULT 'pending_payment' NOT NULL,
  "proof_url" text,
  "decided_by" uuid,
  "decided_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "invoices" (
  "id" uuid PRIMARY KEY NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "public"."orders"("id") ON DELETE cascade,
  "amount" integer NOT NULL,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invoices_amount_nonnegative" CHECK ("invoices"."amount" >= 0)
);--> statement-breakpoint
CREATE TABLE "enterprise_leads" (
  "id" uuid PRIMARY KEY NOT NULL,
  "nama" text NOT NULL,
  "email" text NOT NULL,
  "kebutuhan" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "enterprise_leads_bounded" CHECK (length("enterprise_leads"."nama") BETWEEN 1 AND 200 AND length("enterprise_leads"."email") BETWEEN 3 AND 320 AND length("enterprise_leads"."kebutuhan") BETWEEN 1 AND 4000)
);--> statement-breakpoint
CREATE TABLE "org_invitations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "org_invitations_email_bounded" CHECK (length("org_invitations"."email") BETWEEN 3 AND 320)
);--> statement-breakpoint
CREATE INDEX "packages_active_idx" ON "packages" USING btree ("active");--> statement-breakpoint
CREATE INDEX "orders_org_status_idx" ON "orders" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_package_idx" ON "orders" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_order_idx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "enterprise_leads_email_idx" ON "enterprise_leads" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "org_invitations_token_hash_unique" ON "org_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "org_invitations_org_email_idx" ON "org_invitations" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX "org_invitations_expires_idx" ON "org_invitations" USING btree ("expires_at");--> statement-breakpoint

INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Starter', 'starter', 99000, 5, 5, 1, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'starter');--> statement-breakpoint
INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Growth', 'growth', 249000, 20, 20, 1, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'growth');--> statement-breakpoint
INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Pro', 'pro', 399000, 50, 50, 3, 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'pro');--> statement-breakpoint
INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Enterprise', 'enterprise', 550000, 100, 100, 10, 30, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'enterprise');--> statement-breakpoint

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.packages FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS packages_runtime_read ON public.packages;--> statement-breakpoint
CREATE POLICY packages_runtime_read ON public.packages FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
GRANT SELECT ON public.packages TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.enterprise_leads FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.org_invitations FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_order uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.packages WHERE id = p_package_id AND active) THEN
    RAISE EXCEPTION 'package unavailable' USING ERRCODE = '42501';
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
  INSERT INTO public.orders(id, user_id, org_id, package_id, status, created_at, updated_at)
  VALUES (v_order, p_actor_id, p_org_id, p_package_id, 'pending_payment', p_now, p_now);
  -- Audit order tanpa org menumpang ke org platform (audit_logs.organization_id
  -- ber-FK wajib); dilewati hanya jika registry platform belum ada.
  SELECT COALESCE(p_org_id, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.create', 'order', v_order::text, 'succeeded', ARRAY['package','status'], jsonb_build_object('packageId', p_package_id, 'status', 'pending_payment'), p_request_id, p_now);
  END IF;
  RETURN v_order;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_order_submit_proof(p_actor_id uuid, p_request_id text, p_order_id uuid, p_proof_url text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid;
  v_audit_org uuid;
BEGIN
  SELECT org_id INTO v_org FROM public.orders WHERE id = p_order_id AND user_id = p_actor_id AND status = 'pending_payment';
  IF NOT FOUND THEN
    IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
      RAISE EXCEPTION 'order not found' USING ERRCODE = '42501';
    END IF;
    SELECT org_id INTO v_org FROM public.orders WHERE id = p_order_id AND status = 'pending_payment';
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  IF p_proof_url IS NULL OR length(p_proof_url) NOT BETWEEN 8 AND 2000 THEN
    RAISE EXCEPTION 'proof url invalid' USING ERRCODE = '42501';
  END IF;
  UPDATE public.orders SET proof_url = p_proof_url, status = 'waiting_verification', updated_at = p_now WHERE id = p_order_id;
  SELECT COALESCE(v_org, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.submit_proof', 'order', p_order_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'waiting_verification'), p_request_id, p_now);
  END IF;
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_submit_proof(uuid, text, uuid, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_submit_proof(uuid, text, uuid, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_order_decide(p_actor_id uuid, p_request_id text, p_order_id uuid, p_approve boolean, p_org_id uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid; v_plan text; v_price integer; v_period_end timestamptz := p_now + interval '30 days';
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT o.org_id, p.plan, p.price_idr INTO v_org, v_plan, v_price
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id
  WHERE o.id = p_order_id AND o.status = 'waiting_verification';
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_org IS NULL THEN
    IF p_org_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
      RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
    END IF;
    v_org := p_org_id;
    UPDATE public.orders SET org_id = v_org, updated_at = p_now WHERE id = p_order_id;
  END IF;
  IF NOT p_approve THEN
    UPDATE public.orders SET status = 'rejected', decided_by = p_actor_id, decided_at = p_now, updated_at = p_now WHERE id = p_order_id;
  ELSE
    UPDATE public.orders SET status = 'active', decided_by = p_actor_id, decided_at = p_now, updated_at = p_now WHERE id = p_order_id;
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (v_org, v_plan::public.subscription_plan, 'active', p_now, v_period_end, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO UPDATE SET plan = EXCLUDED.plan, status = 'active', period_starts_at = EXCLUDED.period_starts_at, period_ends_at = EXCLUDED.period_ends_at, version = public.subscriptions.version + 1, updated_at = EXCLUDED.updated_at;
    INSERT INTO public.invoices(id, order_id, amount, paid_at, created_at)
    VALUES (gen_random_uuid(), p_order_id, v_price, p_now, p_now);
    INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
    VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.activate', 'subscription', v_org::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', v_plan, 'status', 'active', 'periodEndsAt', v_period_end), p_request_id, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.decide', 'order', p_order_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('approved', p_approve), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_decide(uuid, text, uuid, boolean, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_decide(uuid, text, uuid, boolean, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_order_list_mine(p_actor_id uuid)
 RETURNS TABLE(id uuid, package_name text, plan text, price_idr integer, status billing_order_status, org_id uuid, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT o.id, p.name, p.plan, p.price_idr, o.status, o.org_id, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id
  WHERE o.user_id = p_actor_id
    AND (o.user_id = indicate_private.current_verified_user_id()
         OR indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id()))
  ORDER BY o.created_at DESC
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_mine(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_mine(uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_order_list_pending(p_actor_id uuid)
 RETURNS TABLE(id uuid, user_email text, org_id uuid, package_name text, plan text, price_idr integer, proof_url text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, u.email, o.org_id, p.name, p.plan, p.price_idr, o.proof_url, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id JOIN public.users u ON u.id = o.user_id
  WHERE o.status = 'waiting_verification'
  ORDER BY o.created_at;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_pending(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_pending(uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.billing_lead_create(p_nama text, p_email text, p_kebutuhan text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_nama IS NULL OR length(p_nama) NOT BETWEEN 1 AND 200 OR p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 OR p_kebutuhan IS NULL OR length(p_kebutuhan) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'lead fields invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.enterprise_leads(id, nama, email, kebutuhan) VALUES (v_id, p_nama, p_email, p_kebutuhan);
  RETURN v_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_lead_create(text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_lead_create(text, text, text) TO indicate_runtime;--> statement-breakpoint

-- Lockdown: subscription_update hanya untuk platform admin. Cabang tenant
-- `subscription.manage` dicabut — perubahan paket hanya lewat order + approve.
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
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
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan::public.subscription_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan::public.subscription_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint

-- Status akses langganan untuk penegakan F2b: platform > active > grace
-- (tenggang baca-saja 7 hari) > expired > suspended > cancelled > none.
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
    WHEN s.status = 'past_due' THEN 'past_due'
    WHEN s.period_ends_at IS NULL THEN 'active'
    WHEN s.period_ends_at > now() THEN 'active'
    WHEN s.period_ends_at > now() - interval '7 days' THEN 'grace'
    ELSE 'expired'
  END
  FROM (SELECT p_organization_id AS organization_id) AS input
  LEFT JOIN public.subscriptions AS s ON s.organization_id = input.organization_id
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.subscription_access_state(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.subscription_access_state(uuid) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (43, 'billing_orders', 'sha256:919acef65aada477471ff27155d13c3e455028c50bdd429661f18483d6e4e33f');
