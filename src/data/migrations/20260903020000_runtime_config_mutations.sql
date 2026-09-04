-- Security-definer runtime configuration mutation functions for policy singletons,
-- Domain provider-mapping, and per-Site Settings. These complement the shared
-- config mutation added in 0022 and follow the same transaction shape: revalidate
-- authorization, optimistically version-predicated UPDATE, appending a runtime
-- revision, a sanitized audit event, and every durable invalidation intent in the
-- same transaction. Platform functions require the explicit platform permission
-- `platform.runtime_config.manage`; the Site Settings function requires an active
-- Membership holding `site_settings.manage` for the exact Organization/Site.
-- Follows the Phase 6 pattern: explicit search_path, REVOKE ... FROM PUBLIC,
-- GRANT EXECUTE to indicate_runtime only, no dynamic SQL, no credential-bearing
-- return columns.

-- =============================================================================
-- POLICY MUTATIONS (optimistic; one transaction for value+revision+audit+intent)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_media_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_allowed_mime_types text[],
  p_max_object_bytes integer,
  p_upload_authorization_seconds integer,
  p_read_authorization_seconds integer
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

  UPDATE public.media_policy AS m
     SET allowed_mime_types = p_allowed_mime_types,
         max_object_bytes = p_max_object_bytes,
         upload_authorization_seconds = p_upload_authorization_seconds,
         read_authorization_seconds = p_read_authorization_seconds,
         version = version + 1,
         updated_at = now()
   WHERE m.id = 'singleton' AND m.version = p_expected_version
   RETURNING m.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'media_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'media_policy', NULL, p_expected_version, v_after,
    ARRAY['allowed_mime_types','max_object_bytes','upload_authorization_seconds','read_authorization_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_media_policy(uuid, integer, text[], integer, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_media_policy(uuid, integer, text[], integer, integer, integer) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_publication_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_max_attempts integer,
  p_retry_delays_seconds integer[],
  p_lease_seconds integer,
  p_batch_size integer,
  p_function_deadline_seconds integer
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

  UPDATE public.publication_policy AS pp
     SET max_attempts = p_max_attempts,
         retry_delays_seconds = p_retry_delays_seconds,
         lease_seconds = p_lease_seconds,
         batch_size = p_batch_size,
         function_deadline_seconds = p_function_deadline_seconds,
         version = version + 1,
         updated_at = now()
   WHERE pp.id = 'singleton' AND pp.version = p_expected_version
   RETURNING pp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'publication_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'publication_policy', NULL, p_expected_version, v_after,
    ARRAY['max_attempts','retry_delays_seconds','lease_seconds','batch_size','function_deadline_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(uuid, integer, integer, integer[], integer, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(uuid, integer, integer, integer[], integer, integer, integer) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_webhook_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_freshness_seconds integer,
  p_replay_retention_seconds integer
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

  UPDATE public.webhook_policy AS wp
     SET freshness_seconds = p_freshness_seconds,
         replay_retention_seconds = p_replay_retention_seconds,
         version = version + 1,
         updated_at = now()
   WHERE wp.id = 'singleton' AND wp.version = p_expected_version
   RETURNING wp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'webhook_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'webhook_policy', NULL, p_expected_version, v_after,
    ARRAY['freshness_seconds','replay_retention_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(uuid, integer, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(uuid, integer, integer, integer) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_cache_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_public_cache_seconds integer,
  p_cache_version integer
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

  UPDATE public.cache_policy AS cp
     SET public_cache_seconds = p_public_cache_seconds,
         cache_version = p_cache_version,
         version = version + 1,
         updated_at = now()
   WHERE cp.id = 'singleton' AND cp.version = p_expected_version
   RETURNING cp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'cache_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'cache_policy', NULL, p_expected_version, v_after,
    ARRAY['public_cache_seconds','cache_version'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(uuid, integer, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(uuid, integer, integer, integer) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(
  p_actor_id uuid,
  p_endpoint_class public.rate_limit_endpoint_class,
  p_expected_version integer,
  p_allowance integer,
  p_window_seconds integer
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

  UPDATE public.rate_limit_policies AS r
     SET allowance = p_allowance,
         window_seconds = p_window_seconds,
         version = version + 1,
         updated_at = now()
   WHERE r.endpoint_class = p_endpoint_class AND r.version = p_expected_version
   RETURNING r.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'rate_limit_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'rate_limit_policy', NULL, p_expected_version, v_after,
    ARRAY['allowance','window_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(uuid, public.rate_limit_endpoint_class, integer, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(uuid, public.rate_limit_endpoint_class, integer, integer, integer) TO indicate_runtime;--> statement-breakpoint

-- =============================================================================
-- DOMAIN PROVIDER MAPPING (assign a Cloudflare zone to a Domain)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_domain_provider_mapping(
  p_actor_id uuid,
  p_domain_id uuid,
  p_zone_id text,
  p_expected_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
  v_org uuid;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.domains AS d
     SET cloudflare_zone_id = p_zone_id,
         version = version + 1,
         updated_at = now()
   WHERE d.id = p_domain_id AND d.version = p_expected_version
   RETURNING d.version, d.organization_id INTO v_after, v_org;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'domain_provider_mapping');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), v_org, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'domain', p_domain_id, p_expected_version, v_after,
    ARRAY['cloudflare_zone_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, domain_id, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'domain', v_org, p_domain_id,
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_domain_provider_mapping(uuid, uuid, text, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_domain_provider_mapping(uuid, uuid, text, integer) TO indicate_runtime;--> statement-breakpoint

-- =============================================================================
-- SITE SETTINGS MUTATION (same-Organization/active-Membership/permission checked)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_site_settings(
  p_actor_id uuid,
  p_org_id uuid,
  p_site_id uuid,
  p_locale text,
  p_seo_default_title text,
  p_seo_default_description text,
  p_seo_robots_directive text,
  p_seo_open_graph_site_name text,
  p_seo_schema_version integer,
  p_fallback_media_id uuid,
  p_expected_version integer
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
  IF NOT indicate_private.has_tenant_permission(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.site_settings AS ss
     SET locale = p_locale,
         seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description,
         seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name,
         seo_schema_version = p_seo_schema_version,
         fallback_media_id = p_fallback_media_id,
         version = version + 1,
         updated_at = now()
   WHERE ss.organization_id = p_org_id
     AND ss.site_id = p_site_id
     AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','fallback_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id,
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (25, 'runtime_config_mutations', 'runtime-config-mutations-v1');