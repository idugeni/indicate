-- Subscription tiers: closed plan set plus per-plan quotas.
--
-- Curated from the `drizzle-kit generate` diff (kept verbatim at the top):
-- the plan enum, the plan_quotas table, and the column conversion. The
-- subscriptions table is empty in every environment this has reached, so the
-- text-to-enum rewrite is metadata-only; the legacy free-form value 'mvp'
-- used by old fixtures is retired in favor of 'starter'.
--
-- Hand-appended below the generated diff:
-- 1. Quota seeds matching the published tiers (NULL = unlimited).
-- 2. RLS on plan_quotas: tenant reads go through each organization's own
--    subscription row in application code; the table itself is global
--    reference data readable by the runtime role, writable only by the
--    migration credential.
-- 3. subscription_update keeps its (text) signature for caller compatibility
--    and casts to the enum at the two use sites (row write; audit payload
--    keeps the text form).

CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'growth', 'enterprise');--> statement-breakpoint
CREATE TABLE "plan_quotas" (
	"plan" "public"."subscription_plan" PRIMARY KEY NOT NULL,
	"max_domains" integer,
	"max_sites" integer,
	"max_members" integer,
	"max_api_keys" integer,
	CONSTRAINT "plan_quotas_nonnegative" CHECK (("plan_quotas"."max_domains" IS NULL OR "plan_quotas"."max_domains" > 0) AND ("plan_quotas"."max_sites" IS NULL OR "plan_quotas"."max_sites" > 0) AND ("plan_quotas"."max_members" IS NULL OR "plan_quotas"."max_members" > 0) AND ("plan_quotas"."max_api_keys" IS NULL OR "plan_quotas"."max_api_keys" > 0))
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";--> statement-breakpoint
INSERT INTO public.plan_quotas (plan, max_domains, max_sites, max_members, max_api_keys) VALUES
  ('starter', 10, 10, NULL, NULL),
  ('growth', 50, 50, NULL, NULL),
  ('enterprise', NULL, NULL, NULL, NULL);--> statement-breakpoint
ALTER TABLE public.plan_quotas ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.plan_quotas FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY plan_quotas_runtime_read ON public.plan_quotas FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
GRANT SELECT ON public.plan_quotas TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.permission_has_tenant(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
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
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (40, 'subscription_tiers', 'subscription-tiers-v1');
