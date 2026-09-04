-- Security-definer runtime configuration functions plus grants. All reads and
-- writes on the shared/policy config tables flow through these fixed-shape
-- functions; direct table DML remains revoked. Follows the Phase 6 pattern:
-- explicit search_path, REVOKE ... FROM PUBLIC, GRANT EXECUTE to indicate_runtime
-- only, no dynamic SQL, no credential-bearing return columns.

-- =============================================================================
-- READ FUNCTIONS (fixed return shapes, runtime role enumerates config)
-- =============================================================================
CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_revision(p_environment text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT max(version)
  FROM public.runtime_config_revisions
  WHERE environment::text = p_environment
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_revision(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_revision(text) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_shared()
RETURNS TABLE (
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
AS $$
BEGIN
  RETURN QUERY
  SELECT s.supabase_project_ref, s.cloudflare_account_id, s.vercel_project_id, s.vercel_team_id,
         s.vercel_production_target_hostname, s.r2_account_id, s.r2_bucket_name,
         s.upstash_redis_resource_id, s.version, s.updated_at
  FROM public.shared_deployment_config AS s
  LIMIT 1;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_shared() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_shared() TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_policies()
RETURNS TABLE (
  policy_kind text,
  endpoint_class text,
  fields jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
    SELECT 'media_policy'::text,
           NULL::text,
           jsonb_build_object(
             'allowedMimeTypes', mp.allowed_mime_types,
             'maxObjectBytes', mp.max_object_bytes,
             'uploadAuthorizationSeconds', mp.upload_authorization_seconds,
             'readAuthorizationSeconds', mp.read_authorization_seconds,
             'version', mp.version
           )
    FROM public.media_policy AS mp
  UNION ALL
    SELECT 'publication_policy', NULL,
           jsonb_build_object(
             'maxAttempts', pp.max_attempts,
             'retryDelaysSeconds', pp.retry_delays_seconds,
             'leaseSeconds', pp.lease_seconds,
             'batchSize', pp.batch_size,
             'functionDeadlineSeconds', pp.function_deadline_seconds,
             'version', pp.version
           )
    FROM public.publication_policy AS pp
  UNION ALL
    SELECT 'webhook_policy', NULL,
           jsonb_build_object(
             'freshnessSeconds', wp.freshness_seconds,
             'replayRetentionSeconds', wp.replay_retention_seconds,
             'version', wp.version
           )
    FROM public.webhook_policy AS wp
  UNION ALL
    SELECT 'cache_policy', NULL,
           jsonb_build_object(
             'publicCacheSeconds', cp.public_cache_seconds,
             'cacheVersion', cp.cache_version,
             'version', cp.version
           )
    FROM public.cache_policy AS cp
  UNION ALL
    SELECT 'rate_limit_policy'::text, rl.endpoint_class::text,
           jsonb_build_object(
             'allowance', rl.allowance,
             'windowSeconds', rl.window_seconds,
             'version', rl.version
           )
    FROM public.rate_limit_policies AS rl;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_policies() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_policies() TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_domains()
RETURNS TABLE (
  organization_id uuid,
  domain_id uuid,
  normalized_hostname text,
  cloudflare_zone_id text,
  routing_version integer,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT d.organization_id, d.id, d.normalized_hostname, d.cloudflare_zone_id,
         d.routing_version, d.version
  FROM public.domains AS d
  WHERE d.status = 'active'
    AND d.cloudflare_zone_id IS NOT NULL
  ORDER BY d.normalized_hostname;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_domains() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_domains() TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_sites()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  domain_id uuid,
  normalized_hostname text,
  region_id uuid,
  routing_version integer,
  content_version integer,
  version integer,
  domain_organization_id uuid,
  domain_normalized_hostname text,
  settings_version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT s.organization_id, s.id, s.domain_id, s.normalized_hostname, s.region_id,
         s.routing_version, s.content_version, s.version,
         d.organization_id, d.normalized_hostname,
         COALESCE(ss.version, 0)
  FROM public.sites AS s
  JOIN public.domains AS d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.site_settings AS ss
    ON ss.organization_id = s.organization_id AND ss.site_id = s.id
  WHERE s.status = 'active'
    AND s.activation_state = 'active'
  ORDER BY s.normalized_hostname;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_sites() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_sites() TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_site_settings()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  locale text,
  seo_default_title text,
  seo_default_description text,
  seo_robots_directive text,
  seo_open_graph_site_name text,
  seo_schema_version integer,
  fallback_media_id uuid,
  fallback_media_object_key text,
  fallback_media_state text,
  fallback_media_organization_id uuid,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT ss.organization_id, ss.site_id, ss.locale, ss.seo_default_title,
         ss.seo_default_description, ss.seo_robots_directive,
         ss.seo_open_graph_site_name, ss.seo_schema_version,
         ss.fallback_media_id, m.object_key, m.state::text, m.organization_id,
         ss.version
  FROM public.site_settings AS ss
  LEFT JOIN public.media AS m
    ON m.organization_id = ss.organization_id AND m.id = ss.fallback_media_id
  ORDER BY ss.organization_id, ss.site_id;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_site_settings() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_site_settings() TO indicate_runtime;--> statement-breakpoint

-- =============================================================================
-- MUTATION FUNCTIONS (optimistic; one transaction for value+revision+audit+intent)
-- =============================================================================
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_shared(
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
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.shared_deployment_config AS s
     SET supabase_project_ref = p_supabase_project_ref,
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
    ARRAY['supabase_project_ref','cloudflare_account_id','vercel_project_id','vercel_team_id',
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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.claim_runtime_config_invalidations(
  p_limit integer,
  p_lease_until timestamptz
)
RETURNS TABLE (
  intent_id uuid,
  runtime_revision bigint,
  partition_kind text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  claim_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents AS i
     SET status = 'claimed',
         attempts = attempts + 1,
         claim_token = gen_random_uuid(),
         claim_expires_at = p_lease_until,
         updated_at = now()
   WHERE i.id IN (
     SELECT i2.id
     FROM public.runtime_config_invalidation_intents AS i2
     WHERE i2.status = 'pending'
        OR (i2.status = 'failed' AND i2.next_attempt_at <= now())
     LIMIT p_limit
   )
   RETURNING i.id, i.runtime_revision, i.partition_kind::text, i.organization_id,
             i.domain_id, i.site_id, i.claim_token;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_runtime_config_invalidations(integer, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_runtime_config_invalidations(integer, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.complete_runtime_config_invalidation(
  p_intent_id uuid,
  p_claim_token uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents
     SET status = 'completed',
         updated_at = now()
   WHERE id = p_intent_id AND claim_token = p_claim_token AND status = 'claimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalidation claim stale or unknown' USING ERRCODE = '55000';
  END IF;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.complete_runtime_config_invalidation(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.complete_runtime_config_invalidation(uuid, uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.fail_runtime_config_invalidation(
  p_intent_id uuid,
  p_claim_token uuid,
  p_category text,
  p_next_attempt_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents
     SET status = 'failed',
         failure_category = p_category,
         next_attempt_at = p_next_attempt_at,
         updated_at = now()
   WHERE id = p_intent_id AND claim_token = p_claim_token AND status = 'claimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalidation claim stale or unknown' USING ERRCODE = '55000';
  END IF;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.fail_runtime_config_invalidation(uuid, uuid, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.fail_runtime_config_invalidation(uuid, uuid, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (23, 'runtime_config_functions', 'runtime-config-functions-v1');