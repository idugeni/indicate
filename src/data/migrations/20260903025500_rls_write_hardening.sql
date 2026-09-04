-- RLS write hardening: gate security-sensitive writes on actor authorization.
--
-- The v36 split isolated per-command policies; this migration tightens the
-- WRITE side where a bare tenant check is insufficient. All predicates mirror
-- the permission strings the application already enforces in code, so no
-- legitimate flow changes behavior (verified against every repository writer):
--
-- 1. actor_has_tenant_permission(): single reviewer for "may actor A mutate
--    authorization data in the current org". Mirrors the application's own
--    authorization branches (user membership grants, api_key scopes incl.
--    expiry, telegram mapping role grants), plus a first-provisioning
--    bootstrap exception (org without memberships yet) and the platform
--    escape hatch. SECURITY INVOKER so its internal reads stay tenant-scoped;
--    callers wrap it in a scalar subquery. No recursion: it only performs
--    SELECTs, and no SELECT policy calls it.
-- 2. memberships / roles / role_permissions / telegram_identity_mappings /
--    api_keys: INSERT/UPDATE/DELETE require tenant AND the matching
--    permission (membership.manage, role.manage, telegram.manage,
--    api_key.manage). SELECT stays tenant-only.
-- 3. users: no DELETE policy (default deny) + REVOKE DELETE; identity columns
--    (id, auth_user_id) made immutable by trigger (RLS WITH CHECK cannot
--    reference OLD rows). INSERT/SELECT/UPDATE keep the self predicate so the
--    signup/ensure flow (authorization-repository) keeps working.
-- 4. organizations: explicit DELETE-deny policy + REVOKE DELETE (no code path
--    deletes organizations; verified by repository audit).
-- 5. runtime_config_audit_logs: REVOKE UPDATE/DELETE (append-only; the
--    *_append_only_guard trigger remains the second lock). audit_logs already
--    INSERT+SELECT-only: drop its UPDATE/DELETE policies.
-- 6. Null-organization rows (audit RC, invalidation intents, replay claims):
--    SELECT keeps the null arm (workers read shared rows); INSERT/UPDATE/
--    DELETE now require a concrete current organization. Every null-org write
--    in the codebase goes through SECURITY DEFINER functions (owner bypass),
--    so no legitimate path breaks.
-- 7. permissions: explicit write-deny policies for indicate_runtime (grants
--    already SELECT-only; this is the second lock).

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
REVOKE ALL ON FUNCTION indicate_private.actor_has_tenant_permission(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.actor_has_tenant_permission(text) TO indicate_runtime;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_insert ON public.memberships;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_update ON public.memberships;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_delete ON public.memberships;--> statement-breakpoint
CREATE POLICY memberships_write_insert ON public.memberships FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));--> statement-breakpoint
CREATE POLICY memberships_write_update ON public.memberships FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));--> statement-breakpoint
CREATE POLICY memberships_write_delete ON public.memberships FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_insert ON public.roles;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_update ON public.roles;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_delete ON public.roles;--> statement-breakpoint
CREATE POLICY roles_write_insert ON public.roles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));--> statement-breakpoint
CREATE POLICY roles_write_update ON public.roles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));--> statement-breakpoint
CREATE POLICY roles_write_delete ON public.roles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_insert ON public.role_permissions;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_update ON public.role_permissions;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_delete ON public.role_permissions;--> statement-breakpoint
CREATE POLICY role_permissions_write_insert ON public.role_permissions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));--> statement-breakpoint
CREATE POLICY role_permissions_write_update ON public.role_permissions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));--> statement-breakpoint
CREATE POLICY role_permissions_write_delete ON public.role_permissions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_insert ON public.telegram_identity_mappings;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_update ON public.telegram_identity_mappings;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_delete ON public.telegram_identity_mappings;--> statement-breakpoint
CREATE POLICY telegram_mappings_write_insert ON public.telegram_identity_mappings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));--> statement-breakpoint
CREATE POLICY telegram_mappings_write_update ON public.telegram_identity_mappings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));--> statement-breakpoint
CREATE POLICY telegram_mappings_write_delete ON public.telegram_identity_mappings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_insert ON public.api_keys;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_update ON public.api_keys;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_delete ON public.api_keys;--> statement-breakpoint
CREATE POLICY api_keys_write_insert ON public.api_keys FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));--> statement-breakpoint
CREATE POLICY api_keys_write_update ON public.api_keys FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));--> statement-breakpoint
CREATE POLICY api_keys_write_delete ON public.api_keys FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.enforce_user_identity_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'user identity is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.enforce_user_identity_immutable() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.enforce_user_identity_immutable() TO indicate_runtime;--> statement-breakpoint
DROP TRIGGER IF EXISTS users_identity_immutable_guard ON public.users;--> statement-breakpoint
CREATE TRIGGER users_identity_immutable_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_user_identity_immutable();--> statement-breakpoint
DROP POLICY IF EXISTS auth_identity_isolation_delete ON public.users;--> statement-breakpoint
REVOKE DELETE ON public.users FROM indicate_runtime;--> statement-breakpoint
DROP POLICY IF EXISTS organization_isolation_delete ON public.organizations;--> statement-breakpoint
CREATE POLICY organization_delete_deny ON public.organizations FOR DELETE TO indicate_runtime USING (false);--> statement-breakpoint
REVOKE DELETE ON public.organizations FROM indicate_runtime;--> statement-breakpoint
REVOKE UPDATE, DELETE ON public.runtime_config_audit_logs FROM indicate_runtime;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_update ON public.audit_logs;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_delete ON public.audit_logs;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_update ON public.runtime_config_audit_logs;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_delete ON public.runtime_config_audit_logs;--> statement-breakpoint
DROP POLICY IF EXISTS permission_scope_isolation_insert ON public.permissions;--> statement-breakpoint
DROP POLICY IF EXISTS permission_scope_isolation_update ON public.permissions;--> statement-breakpoint
DROP POLICY IF EXISTS permission_scope_isolation_delete ON public.permissions;--> statement-breakpoint
CREATE POLICY permission_write_deny_insert ON public.permissions FOR INSERT TO indicate_runtime WITH CHECK (false);--> statement-breakpoint
CREATE POLICY permission_write_deny_delete ON public.permissions FOR DELETE TO indicate_runtime USING (false);--> statement-breakpoint
CREATE POLICY permission_write_deny_update ON public.permissions FOR UPDATE TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_insert ON public.runtime_config_audit_logs;--> statement-breakpoint
CREATE POLICY runtime_config_audit_tenant_insert ON public.runtime_config_audit_logs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_insert ON public.runtime_config_invalidation_intents;--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_insert ON public.runtime_config_invalidation_intents FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_update ON public.runtime_config_invalidation_intents;--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_update ON public.runtime_config_invalidation_intents FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_delete ON public.runtime_config_invalidation_intents;--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_delete ON public.runtime_config_invalidation_intents FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_insert ON public.webhook_replay_claims;--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_insert ON public.webhook_replay_claims FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_update ON public.webhook_replay_claims;--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_update ON public.webhook_replay_claims FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_delete ON public.webhook_replay_claims;--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_delete ON public.webhook_replay_claims FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (37, 'rls_write_hardening', 'rls-write-hardening-v1');
