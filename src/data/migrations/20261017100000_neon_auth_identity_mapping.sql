-- Keep legacy Supabase Auth IDs for rollback while adding a separate Neon Auth identity.
-- Linking is allowed only after the application verifies the Neon email and sets a
-- transaction-local intent flag. Local User IDs, memberships, roles, and access keys
-- remain stable across the provider migration.

ALTER TABLE public.users
  ADD COLUMN neon_auth_user_id uuid;--> statement-breakpoint

ALTER TABLE public.users
  ADD CONSTRAINT users_neon_auth_user_id_unique UNIQUE (neon_auth_user_id);--> statement-breakpoint

CREATE UNIQUE INDEX users_effective_auth_identity_unique
  ON public.users (COALESCE(neon_auth_user_id, auth_user_id));--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.enforce_user_identity_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'user identity is immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW.neon_auth_user_id IS DISTINCT FROM OLD.neon_auth_user_id THEN
    IF OLD.neon_auth_user_id IS NOT NULL
       OR NEW.neon_auth_user_id IS NULL
       OR current_setting('app.neon_auth_identity_link', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Neon identity may only be linked once through the verified linkage path' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.set_verified_user_context(requested_auth_user_id uuid)
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
      AND (auth_user_id = requested_auth_user_id OR neon_auth_user_id = requested_auth_user_id)
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
  WHERE (auth_user_id = indicate_private.current_auth_user_id()
         OR neon_auth_user_id = indicate_private.current_auth_user_id())
    AND id::text = current_setting('app.actor_id', true)
    AND status = 'active'
  LIMIT 1
$$;--> statement-breakpoint

ALTER POLICY auth_identity_isolation_insert ON public.users
  WITH CHECK (
    auth_user_id = indicate_private.current_auth_user_id()
    OR neon_auth_user_id = indicate_private.current_auth_user_id()
  );--> statement-breakpoint

ALTER POLICY auth_identity_isolation_select ON public.users
  USING (
    auth_user_id = indicate_private.current_auth_user_id()
    OR neon_auth_user_id = indicate_private.current_auth_user_id()
  );--> statement-breakpoint

ALTER POLICY auth_identity_isolation_update ON public.users
  USING (
    auth_user_id = indicate_private.current_auth_user_id()
    OR neon_auth_user_id = indicate_private.current_auth_user_id()
  )
  WITH CHECK (
    auth_user_id = indicate_private.current_auth_user_id()
    OR neon_auth_user_id = indicate_private.current_auth_user_id()
  );--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.resolve_dashboard_access_key_identity(p_lookup_id text)
RETURNS TABLE (
  organization_id uuid,
  key_id uuid,
  user_id uuid,
  auth_user_id uuid,
  display_name text,
  avatar_url text,
  user_status record_status,
  key_status api_key_status,
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  salt text,
  verification_hash text,
  membership_status record_status,
  role_id uuid,
  role_tier role_tier,
  role_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT k.organization_id, k.id, u.id, COALESCE(u.neon_auth_user_id, u.auth_user_id),
         u.display_name, u.avatar_url, u.status,
         k.status, k.expires_at, k.last_used_at, k.salt, k.verification_hash,
         m.status, m.role_id, r.tier, r.active
  FROM public.dashboard_access_keys k
  JOIN public.users u ON u.id = k.user_id
  LEFT JOIN public.memberships m ON m.organization_id = k.organization_id AND m.user_id = k.user_id
  LEFT JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id
  WHERE k.lookup_id = p_lookup_id
  LIMIT 1
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.resolve_user_by_email(p_email text)
RETURNS TABLE(id uuid, auth_user_id uuid, display_name text, status record_status)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT u.id, COALESCE(u.neon_auth_user_id, u.auth_user_id), u.display_name, u.status
  FROM public.users AS u
  WHERE lower(btrim(u.email)) = lower(btrim(p_email))
    AND indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id())
  LIMIT 1
$$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (288, 'neon_auth_identity_mapping', 'sha256:021be482aca2364b5835ff17a8a51f3d6fe53730f269ced2a7ea754096b3184d');
