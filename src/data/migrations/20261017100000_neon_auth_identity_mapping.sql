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

ALTER TABLE public.shared_deployment_config
  ADD COLUMN neon_project_id text;--> statement-breakpoint
UPDATE public.shared_deployment_config
   SET neon_project_id = 'soft-moon-84079595'
 WHERE id = 'singleton';--> statement-breakpoint
ALTER TABLE public.shared_deployment_config
  ALTER COLUMN neon_project_id SET NOT NULL;--> statement-breakpoint

DROP FUNCTION indicate_private.read_runtime_config_shared();--> statement-breakpoint
CREATE FUNCTION indicate_private.read_runtime_config_shared()
RETURNS TABLE (
  neon_project_id text,
  supabase_project_ref text,
  cloudflare_account_id text,
  vercel_project_id text,
  vercel_team_id text,
  vercel_production_target_hostname text,
  r2_account_id text,
  r2_bucket_name text,
  upstash_redis_resource_id text,
  version integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $
BEGIN
  RETURN QUERY
  SELECT s.neon_project_id, s.supabase_project_ref, s.cloudflare_account_id, s.vercel_project_id, s.vercel_team_id,
         s.vercel_production_target_hostname, s.r2_account_id, s.r2_bucket_name,
         s.upstash_redis_resource_id, s.version, s.updated_at
  FROM public.shared_deployment_config AS s
  LIMIT 1;
END
$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_shared() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_shared() TO indicate_runtime;--> statement-breakpoint

DROP FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text);--> statement-breakpoint
CREATE FUNCTION indicate_private.mutate_runtime_config_shared(
  p_actor_id uuid,
  p_expected_version integer,
  p_supabase_project_ref text,
  p_cloudflare_account_id text,
  p_vercel_project_id text,
  p_vercel_team_id text,
  p_vercel_production_target_hostname text,
  p_r2_account_id text,
  p_r2_bucket_name text,
  p_upstash_redis_resource_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.shared_deployment_config AS s
     SET neon_project_id = CASE WHEN p_supabase_project_ref ~ '^[a-z0-9]{20}
         vercel_project_id = p_vercel_project_id,
         vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id,
         r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1,
         updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'shared_deployment_config');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'shared_deployment_config', NULL, p_expected_version, v_after,
    ARRAY['neon_project_id','supabase_project_ref','cloudflare_account_id','vercel_project_id','vercel_team_id',
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name',
          'upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared',
    'pending', 0, now()
  );

  RETURN v_after;
END
$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) TO indicate_runtime;--> statement-breakpoint

CREATE TABLE public.identity_link_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_user_id uuid NOT NULL REFERENCES public.users(id),
  legacy_auth_user_id uuid NOT NULL,
  neon_auth_user_id uuid NOT NULL,
  request_id text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_link_audit_local_user_unique UNIQUE (local_user_id),
  CONSTRAINT identity_link_audit_neon_user_unique UNIQUE (neon_auth_user_id)
);--> statement-breakpoint
CREATE INDEX identity_link_audit_linked_at_idx ON public.identity_link_audit_logs (linked_at);--> statement-breakpoint
ALTER TABLE public.identity_link_audit_logs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY identity_link_audit_deny_all ON public.identity_link_audit_logs
  FOR ALL USING (false) WITH CHECK (false);--> statement-breakpoint
REVOKE ALL ON TABLE public.identity_link_audit_logs FROM PUBLIC;--> statement-breakpoint
GRANT INSERT ON TABLE public.identity_link_audit_logs TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (288, 'neon_auth_identity_mapping', 'sha256:84c2360efc2e076ad9e0fb4577427c73968dfa23d69dbebdeeab949233ff8041');
 THEN s.neon_project_id ELSE p_supabase_project_ref END,
         supabase_project_ref = CASE WHEN p_supabase_project_ref ~ '^[a-z0-9]{20}
         vercel_project_id = p_vercel_project_id,
         vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id,
         r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1,
         updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'shared_deployment_config');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'shared_deployment_config', NULL, p_expected_version, v_after,
    ARRAY['neon_project_id','cloudflare_account_id','vercel_project_id','vercel_team_id',
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name',
          'upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared',
    'pending', 0, now()
  );

  RETURN v_after;
END
$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) TO indicate_runtime;--> statement-breakpoint

CREATE TABLE public.identity_link_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_user_id uuid NOT NULL REFERENCES public.users(id),
  legacy_auth_user_id uuid NOT NULL,
  neon_auth_user_id uuid NOT NULL,
  request_id text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_link_audit_local_user_unique UNIQUE (local_user_id),
  CONSTRAINT identity_link_audit_neon_user_unique UNIQUE (neon_auth_user_id)
);--> statement-breakpoint
CREATE INDEX identity_link_audit_linked_at_idx ON public.identity_link_audit_logs (linked_at);--> statement-breakpoint
ALTER TABLE public.identity_link_audit_logs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY identity_link_audit_deny_all ON public.identity_link_audit_logs
  FOR ALL USING (false) WITH CHECK (false);--> statement-breakpoint
REVOKE ALL ON TABLE public.identity_link_audit_logs FROM PUBLIC;--> statement-breakpoint
GRANT INSERT ON TABLE public.identity_link_audit_logs TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (288, 'neon_auth_identity_mapping', 'sha256:045e46d1c5903c795bbe0a92748d48a1fc71f12d8bc50641e6d074787bc85f35');
 THEN p_supabase_project_ref ELSE s.supabase_project_ref END,
         cloudflare_account_id = p_cloudflare_account_id,
         vercel_project_id = p_vercel_project_id,
         vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id,
         r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1,
         updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'shared_deployment_config');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'shared_deployment_config', NULL, p_expected_version, v_after,
    ARRAY['neon_project_id','cloudflare_account_id','vercel_project_id','vercel_team_id',
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name',
          'upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared',
    'pending', 0, now()
  );

  RETURN v_after;
END
$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) TO indicate_runtime;--> statement-breakpoint

CREATE TABLE public.identity_link_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_user_id uuid NOT NULL REFERENCES public.users(id),
  legacy_auth_user_id uuid NOT NULL,
  neon_auth_user_id uuid NOT NULL,
  request_id text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_link_audit_local_user_unique UNIQUE (local_user_id),
  CONSTRAINT identity_link_audit_neon_user_unique UNIQUE (neon_auth_user_id)
);--> statement-breakpoint
CREATE INDEX identity_link_audit_linked_at_idx ON public.identity_link_audit_logs (linked_at);--> statement-breakpoint
ALTER TABLE public.identity_link_audit_logs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY identity_link_audit_deny_all ON public.identity_link_audit_logs
  FOR ALL USING (false) WITH CHECK (false);--> statement-breakpoint
REVOKE ALL ON TABLE public.identity_link_audit_logs FROM PUBLIC;--> statement-breakpoint
GRANT INSERT ON TABLE public.identity_link_audit_logs TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (288, 'neon_auth_identity_mapping', 'sha256:045e46d1c5903c795bbe0a92748d48a1fc71f12d8bc50641e6d074787bc85f35');
