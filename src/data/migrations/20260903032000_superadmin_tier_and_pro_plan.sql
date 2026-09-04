-- F1-DB: superadmin tier + pro subscription plan.
--
-- Forward-only. Enum additions use ADD VALUE (no existing rows are rewritten).
-- 1. `role_tier` gains 'superadmin'; `subscription_plan` gains 'pro',
--    following the CREATE TYPE pattern of 20260903021000_role_tier and
--    20260903031000_subscription_tiers.
-- 2. `plan_quotas` is repaired for all four packages. The previous seeds
--    (starter 10/10/unlimited/unlimited, growth 50/50/unlimited/unlimited,
--    enterprise unlimited) are replaced by the published F1 quotas; 'pro' is
--    inserted. RLS stays runtime-read-only (SELECT to indicate_runtime, no
--    write grant — writes happen only via this migration credential).
-- 3. Platform permission `platform.super_admin` (scope platform, org NULL) is
--    seeded as the replacement for `platform.customer.admin`. The old row is
--    NOT deleted; its description is marked [DEPRECATED]. A transition helper
--    `permission_has_platform_admin()` accepts either grant, and the current
--    platform-gated functions (customer_create/list/update, subscription_update,
--    resolve_user_by_email, actor_has_tenant_permission) are redefined onto it.
--    Legacy snake_case twins (create_customer, ...) are left untouched.
-- 4. `platform_organizations` registry + `is_platform_organization()` +
--    `roles_superadmin_platform_guard` trigger: roles with tier 'superadmin'
--    are rejected unless their organization is registered. The registry starts
--    empty, so the guard is fail-closed until an operator registers the
--    platform org and grants platform.super_admin via
--    src/database/scripts/grant-platform-super-admin.sql (one-time script).

ALTER TYPE "public"."role_tier" ADD VALUE IF NOT EXISTS 'superadmin';--> statement-breakpoint
ALTER TYPE "public"."subscription_plan" ADD VALUE IF NOT EXISTS 'pro';--> statement-breakpoint

INSERT INTO public.plan_quotas (plan, max_domains, max_sites, max_members, max_api_keys) VALUES
  ('starter', 5, 5, 1, 1),
  ('growth', 20, 20, 1, 3),
  ('pro', 50, 50, 3, 10),
  ('enterprise', 100, 100, 10, 30)
ON CONFLICT (plan) DO UPDATE SET
  max_domains = EXCLUDED.max_domains,
  max_sites = EXCLUDED.max_sites,
  max_members = EXCLUDED.max_members,
  max_api_keys = EXCLUDED.max_api_keys;--> statement-breakpoint
ALTER TABLE public.plan_quotas ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.plan_quotas FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS plan_quotas_runtime_read ON public.plan_quotas;--> statement-breakpoint
CREATE POLICY plan_quotas_runtime_read ON public.plan_quotas FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
GRANT SELECT ON public.plan_quotas TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.permissions(id, organization_id, name, scope, description)
VALUES ('00000000-0000-4000-8000-000000006002', NULL, 'platform.super_admin', 'platform', 'Full platform administration (replaces platform.customer.admin)')
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE public.permissions
SET description = '[DEPRECATED — use platform.super_admin] Administer customer Organizations and subscriptions'
WHERE scope = 'platform' AND organization_id IS NULL AND name = 'platform.customer.admin';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "platform_organizations" (
  "organization_id" uuid PRIMARY KEY NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE public.platform_organizations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.platform_organizations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS platform_organizations_runtime_read ON public.platform_organizations;--> statement-breakpoint
CREATE POLICY platform_organizations_runtime_read ON public.platform_organizations FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
GRANT SELECT ON public.platform_organizations TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.is_platform_organization(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_organizations
    WHERE organization_id = p_organization_id
  )
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.is_platform_organization(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.is_platform_organization(uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.roles_superadmin_platform_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.tier = 'superadmin' AND NOT indicate_private.is_platform_organization(NEW.organization_id) THEN
    RAISE EXCEPTION 'superadmin tier restricted to platform organization' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.roles_superadmin_platform_guard() FROM PUBLIC;--> statement-breakpoint
DROP TRIGGER IF EXISTS roles_superadmin_platform_guard ON public.roles;--> statement-breakpoint
CREATE TRIGGER roles_superadmin_platform_guard
BEFORE INSERT OR UPDATE OF organization_id, tier ON public.roles
FOR EACH ROW EXECUTE FUNCTION indicate_private.roles_superadmin_platform_guard();--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.permission_has_platform_admin(p_actor_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  -- Transition helper: 'platform.super_admin' is canonical; the deprecated
  -- 'platform.customer.admin' grant is still honored until its removal.
  SELECT indicate_private.permission_has_platform(p_actor_id, 'platform.super_admin')
      OR indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin')
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.permission_has_platform_admin(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_platform_admin(uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone)
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
  IF p_subscription IS NOT NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_subscription->>'plan', (p_subscription->>'status')::public.subscription_status,
      (p_subscription->>'periodStartsAt')::timestamptz, (p_subscription->>'periodEndsAt')::timestamptz, 1, p_now, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.customer_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, status record_status, customer_metadata jsonb, version integer, created_at timestamp with time zone, updated_at timestamp with time zone, subscription_plan text, subscription_status subscription_status, period_starts_at timestamp with time zone, period_ends_at timestamp with time zone, subscription_version integer, subscription_created_at timestamp with time zone, subscription_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.plan, s.status, s.period_starts_at, s.period_ends_at, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  ORDER BY o.name, o.id;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations SET name = p_name, slug = p_slug, status = p_status,
    customer_metadata = p_metadata, version = version + 1, updated_at = p_now
  WHERE id = p_organization_id AND version = p_expected_version;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.update', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status','customerMetadata'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', p_status, 'customerMetadata', p_metadata), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform_admin(p_actor_id);
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
CREATE OR REPLACE FUNCTION indicate_private.resolve_user_by_email(p_email text)
 RETURNS TABLE(id uuid, auth_user_id uuid, display_name text, status record_status)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT u.id, u.auth_user_id, u.display_name, u.status
  FROM public.users AS u
  WHERE u.email = p_email
    AND indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id())
  LIMIT 1
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.actor_has_tenant_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    NOT EXISTS (
      SELECT 1 FROM public.memberships AS m
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
    )
    OR (SELECT indicate_private.permission_has_platform_admin((SELECT indicate_private.current_verified_user_id())))
    OR (SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), p_permission))
    OR EXISTS (
      SELECT 1
      FROM public.memberships AS m
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
        AND m.user_id = (SELECT indicate_private.current_verified_user_id())
        AND m.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    )
    OR EXISTS (
      SELECT 1 FROM public.api_keys AS k
      WHERE k.organization_id = (SELECT indicate_private.current_organization_id())
        AND k.id::text = current_setting('app.actor_id', true)
        AND k.status = 'active'
        AND (k.expires_at IS NULL OR k.expires_at > now())
        AND k.scopes @> ARRAY[p_permission]
    )
    OR EXISTS (
      SELECT 1
      FROM public.telegram_identity_mappings AS tim
      JOIN public.memberships AS m ON m.organization_id = tim.organization_id AND m.user_id = tim.user_id AND m.role_id = tim.role_id AND m.status = 'active'
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE tim.organization_id = (SELECT indicate_private.current_organization_id())
        AND tim.id::text = current_setting('app.actor_id', true)
        AND tim.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    ),
    false)
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(uuid) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_update(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_update(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_user_by_email(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_user_by_email(text) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (42, 'superadmin_tier_and_pro_plan', 'sha256:b64b1190545cc4e03ef08cedf935312a070df9caaa5cbd40f92a4e4764784e92');
