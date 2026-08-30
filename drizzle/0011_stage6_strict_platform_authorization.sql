-- Stage 6 authorization correction: platform checks must fail closed when the
-- transaction has no verified actor context. Provisioning remains owner-only.
CREATE OR REPLACE FUNCTION indicate_private.stage6_has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT COALESCE(
    indicate_private.current_verified_user_id() = p_actor_id
      AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
      AND EXISTS (
        SELECT 1
        FROM public.platform_user_permissions grant_row
        JOIN public.permissions p ON p.id = grant_row.permission_id
        JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
        WHERE grant_row.user_id = p_actor_id
          AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
      ),
    false
  )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.stage6_has_platform_permission(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.stage6_has_platform_permission(uuid, text) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (12, 'stage6_strict_platform_authorization', 'stage6-strict-platform-authorization-v1');
