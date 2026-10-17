-- Remove the legacy Supabase project reference from the runtime projection
-- after the Neon deployment is active. The table column remains temporarily
-- for rollback evidence; the application only consumes neon_project_id.
DROP FUNCTION indicate_private.read_runtime_config_shared();--> statement-breakpoint
CREATE FUNCTION indicate_private.read_runtime_config_shared()
RETURNS TABLE (
  neon_project_id text,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT s.neon_project_id, s.cloudflare_account_id, s.vercel_project_id, s.vercel_team_id,
         s.vercel_production_target_hostname, s.r2_account_id, s.r2_bucket_name,
         s.upstash_redis_resource_id, s.version, s.updated_at
  FROM public.shared_deployment_config AS s
  LIMIT 1;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_shared() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_shared() TO indicate_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_shared() TO indicate_runtime_login;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (290, 'neon_runtime_config_projection', 'sha256:0000000000000000000000000000000000000000000000000000000000000000');
