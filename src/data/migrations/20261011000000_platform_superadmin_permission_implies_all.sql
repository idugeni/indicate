-- Platform super-admin implies every registered platform permission.
-- Keep identity verification and actor binding mandatory; only the grant predicate broadens.
CREATE OR REPLACE FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $function$
  SELECT COALESCE(
    indicate_private.current_verified_user_id() = p_actor_id
      AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
      AND EXISTS (
        SELECT 1
        FROM public.permissions AS target_permission
        WHERE target_permission.name = p_permission
          AND target_permission.scope = 'platform'
          AND target_permission.organization_id IS NULL
      )
      AND EXISTS (
        SELECT 1
        FROM public.platform_user_permissions AS grant_row
        JOIN public.permissions AS p ON p.id = grant_row.permission_id
        JOIN public.users AS u ON u.id = grant_row.user_id AND u.status = 'active'
        WHERE grant_row.user_id = p_actor_id
          AND p.scope = 'platform'
          AND p.organization_id IS NULL
          AND (
            p.name = p_permission
            OR p.name = 'platform.super_admin'
          )
      ),
    false
  )
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.permission_has_platform(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_platform(uuid, text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (279, 'platform_superadmin_permission_implies_all', 'sha256:b10b24a04f98784ee2ae77bfbaa523aab5a89d65c407ea34bf531d230974728e');
