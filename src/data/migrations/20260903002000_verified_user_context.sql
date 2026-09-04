-- Phase 3 verified Supabase Auth context and narrow User projections.
-- Forced users RLS remains unchanged: runtime code must establish a verified identity
-- before any User-backed Membership projection is available.
CREATE OR REPLACE FUNCTION indicate_private.set_verified_user_context(
  requested_auth_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  requested_actor_id text;
BEGIN
  requested_actor_id := current_setting('app.actor_id', true);
  IF requested_auth_user_id IS NULL OR requested_actor_id IS NULL OR requested_actor_id = '' THEN
    RAISE EXCEPTION 'verified user context is required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = requested_actor_id
      AND auth_user_id = requested_auth_user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'verified user context mismatch' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.auth_user_id', requested_auth_user_id::text, true);
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.current_verified_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = indicate_private.current_auth_user_id()
    AND id::text = current_setting('app.actor_id', true)
    AND status = 'active'
  LIMIT 1
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.lookup_user_display_name(
  requested_user_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT target_user.display_name
  FROM public.users AS target_user
  WHERE target_user.id = requested_user_id
    AND indicate_private.current_verified_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.memberships AS caller_membership
      WHERE caller_membership.organization_id = indicate_private.current_organization_id()
        AND caller_membership.user_id = indicate_private.current_verified_user_id()
        AND caller_membership.status = 'active'
    )
  LIMIT 1
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION indicate_private.set_verified_user_context(uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.current_verified_user_id() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.lookup_user_display_name(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.set_verified_user_context(uuid) TO indicate_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.current_verified_user_id() TO indicate_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.lookup_user_display_name(uuid) TO indicate_runtime;--> statement-breakpoint

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (5, 'verified_user_context', 'drizzle-0004')
ON CONFLICT (version) DO NOTHING;
