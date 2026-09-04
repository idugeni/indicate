-- Function API reconciliation: converge stored functions and triggers on the
-- live Supabase API surface.
--
-- The application calls the current function names (customer_create,
-- claim_publishing_dispatch_gaps, permission_has_platform, ...), but this
-- repository's older migration files still define the previous generation
-- (create_customer, claim_dispatch_gaps, has_platform_permission, ...), so a
-- fresh install would miss functions the runtime needs. This migration
-- re-applies every diverged or renamed function with its live body (plus two
-- live bug fixes: policy singletons address singleton_key, audit entry points
-- use 'dashboard'), drops the retired names, rebinds the three renamed
-- triggers, and mirrors the live EXECUTE grants. Against the live database
-- every statement is a no-op except the documented fixes; tables are empty.

DROP TRIGGER IF EXISTS capture_replay_business_receipt ON public.audit_logs;--> statement-breakpoint
DROP TRIGGER IF EXISTS role_permission_scope_guard ON public.role_permissions;--> statement-breakpoint
DROP TRIGGER IF EXISTS site_hostname_guard ON public.sites;--> statement-breakpoint
DROP TRIGGER IF EXISTS invalidation_tasks_enable_cache_bypass ON public.invalidation_tasks;--> statement-breakpoint
DROP TRIGGER IF EXISTS publishing_job_transition_guard ON public.publishing_jobs;--> statement-breakpoint
DROP TRIGGER IF EXISTS publishing_target_transition_guard ON public.publishing_job_targets;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.enforce_job_transition();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.enforce_target_transition();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.claim_dispatch_gaps(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.find_expired_leases(requested_now timestamptz, requested_limit integer);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.claim_transition_receipts(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.claim_cleanup_tasks(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.claim_invalidation_tasks(p_now timestamptz, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.site_hostname_guard();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.resolve_public_host(p_hostname text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.is_pending_host(p_hostname text, p_attempt_id uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.is_previous_host_owned(p_organization_id uuid, p_site_id uuid, p_hostname text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.claim_activation_attempts(p_now timestamptz, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.enable_cache_bypass_on_enqueue();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.complete_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.fail_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamptz, p_terminal boolean, p_now timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.ensure_org_permissions(p_organization_id uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.claim_replay(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamptz, p_expires_at timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.finish_replay(p_source text, p_replay_id text, p_body_digest text, p_status public.replay_claim_status, p_outcome jsonb, p_now timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.has_platform_permission(p_actor_id uuid, p_permission text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.has_tenant_permission(p_actor_id uuid, p_organization_id uuid, p_permission text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.list_customers(p_actor_id uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.create_customer(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.update_customer(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status public.record_status, p_metadata jsonb, p_now timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.update_subscription(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status public.subscription_status, p_period_starts_at timestamptz, p_period_ends_at timestamptz, p_now timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.role_permission_scope_guard();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.provision_platform_permission(p_user_id uuid, p_permission text, p_provisioned_by text);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.list_platform_permissions(p_user_id uuid);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.capture_replay_business_receipt();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.discover_active_hosts(p_hostnames text[]);--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.cache_policy AS cp
     SET public_cache_seconds = p_public_cache_seconds, cache_version = p_cache_version,
         version = version + 1, updated_at = now()
   WHERE cp.singleton_key = 'singleton' AND cp.version = p_expected_version
   RETURNING cp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'cache_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'cache_policy', NULL, p_expected_version, v_after,
    ARRAY['public_cache_seconds','cache_version'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.media_policy AS m
     SET allowed_mime_types = p_allowed_mime_types, max_object_bytes = p_max_object_bytes,
         upload_authorization_seconds = p_upload_authorization_seconds, read_authorization_seconds = p_read_authorization_seconds,
         version = version + 1, updated_at = now()
   WHERE m.singleton_key = 'singleton' AND m.version = p_expected_version
   RETURNING m.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
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
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_batch_size integer, p_function_deadline_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.publication_policy AS pp
     SET max_attempts = p_max_attempts, retry_delays_seconds = p_retry_delays_seconds,
         lease_seconds = p_lease_seconds, batch_size = p_batch_size,
         function_deadline_seconds = p_function_deadline_seconds, version = version + 1, updated_at = now()
   WHERE pp.singleton_key = 'singleton' AND pp.version = p_expected_version
   RETURNING pp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
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
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.webhook_policy AS wp
     SET freshness_seconds = p_freshness_seconds, replay_retention_seconds = p_replay_retention_seconds,
         version = version + 1, updated_at = now()
   WHERE wp.singleton_key = 'singleton' AND wp.version = p_expected_version
   RETURNING wp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'webhook_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'webhook_policy', NULL, p_expected_version, v_after,
    ARRAY['freshness_seconds','replay_retention_seconds'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone)
 RETURNS TABLE(intent_id uuid, runtime_revision bigint, partition_kind text, organization_id uuid, domain_id uuid, site_id uuid, claim_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
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
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.enforce_article_site_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN RETURN NEW; END IF;
  IF OLD.state IN ('published', 'failed') AND NEW.state = 'queued' AND EXISTS (
    SELECT 1 FROM public.publishing_job_targets AS target
    INNER JOIN public.publishing_jobs AS job
      ON job.organization_id = target.organization_id AND job.id = target.job_id
    WHERE target.organization_id = OLD.organization_id AND target.article_site_id = OLD.id
      AND target.state = 'queued' AND job.state = 'queued'
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid article site current-projection transition' USING ERRCODE = '23514';
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint; v_org uuid;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.domains AS d
     SET cloudflare_zone_id = p_zone_id, version = version + 1, updated_at = now()
   WHERE d.id = p_domain_id AND d.version = p_expected_version
   RETURNING d.version, d.organization_id INTO v_after, v_org;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'domain_provider_mapping');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), v_org, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'domain', p_domain_id, p_expected_version, v_after, ARRAY['cloudflare_zone_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, domain_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'domain', v_org, p_domain_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.shared_deployment_config AS s
     SET supabase_project_ref = p_supabase_project_ref, cloudflare_account_id = p_cloudflare_account_id,
         vercel_project_id = p_vercel_project_id, vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id, r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1, updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
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
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name','upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared', 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.site_settings AS ss
     SET locale = p_locale, seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description, seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name, seo_schema_version = p_seo_schema_version,
         fallback_media_id = p_fallback_media_id, version = version + 1, updated_at = now()
   WHERE ss.organization_id = p_org_id AND ss.site_id = p_site_id AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','fallback_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.rate_limit_policies AS r
     SET allowance = p_allowance, window_seconds = p_window_seconds, version = version + 1, updated_at = now()
   WHERE r.endpoint_class = p_endpoint_class AND r.version = p_expected_version
   RETURNING r.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'rate_limit_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'rate_limit_policy', NULL, p_expected_version, v_after,
    ARRAY['allowance','window_seconds'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_domains()
 RETURNS TABLE(organization_id uuid, domain_id uuid, normalized_hostname text, cloudflare_zone_id text, routing_version integer, version integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  SELECT d.organization_id, d.id, d.normalized_hostname, d.cloudflare_zone_id,
         d.routing_version, d.version
  FROM public.domains AS d
  WHERE d.status = 'active'
    AND d.cloudflare_zone_id IS NOT NULL
  ORDER BY d.normalized_hostname;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT organization_id FROM public.webhook_replay_claims WHERE source = p_source AND replay_id = p_replay_id
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text)
 RETURNS TABLE(organization_id uuid, id uuid, lookup_id text, name text, salt text, verification_hash text, scopes text[], status api_key_status, predecessor_id uuid, expires_at timestamp with time zone, last_used_at timestamp with time zone, version integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT k.organization_id, k.id, k.lookup_id, k.name, k.salt,
         k.verification_hash, k.scopes, k.status, k.predecessor_id,
         k.expires_at, k.last_used_at, k.version, k.created_at, k.updated_at
  FROM public.api_keys k WHERE k.lookup_id = p_lookup_id LIMIT 1
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
 RETURNS TABLE(mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid, telegram_user_id text, telegram_chat_id text, permissions text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, task_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT task.organization_id, task.id FROM public.object_cleanup_tasks AS task
    WHERE task.status IN ('pending', 'processing') AND task.next_attempt_at <= requested_now
      AND (task.reconciliation_claim_expires_at IS NULL OR task.reconciliation_claim_expires_at <= requested_now)
    ORDER BY task.next_attempt_at, task.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.object_cleanup_tasks AS task
  SET status = 'processing', reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at, updated_at = requested_now
  FROM candidates WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.organization_id, task.id;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, job_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT job.organization_id, job.id
    FROM public.publishing_jobs AS job
    WHERE job.state IN ('queued', 'retrying') AND job.dispatch_status = 'pending'
      AND job.next_dispatch_at <= requested_now
      AND (job.reconciliation_claim_expires_at IS NULL OR job.reconciliation_claim_expires_at <= requested_now)
    ORDER BY job.next_dispatch_at, job.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publishing_jobs AS job
  SET reconciliation_claim_token = requested_token, reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates WHERE job.organization_id = candidates.organization_id AND job.id = candidates.id
  RETURNING job.organization_id, job.id;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, receipt_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT receipt.organization_id, receipt.id FROM public.publication_transition_receipts AS receipt
    WHERE receipt.acknowledged_at IS NULL
      AND (receipt.reconciliation_claim_expires_at IS NULL OR receipt.reconciliation_claim_expires_at <= requested_now)
    ORDER BY receipt.created_at, receipt.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publication_transition_receipts AS receipt
  SET reconciliation_claim_token = requested_token, reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates WHERE receipt.organization_id = candidates.organization_id AND receipt.id = candidates.id
  RETURNING receipt.organization_id, receipt.id;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = 'completed', reconciliation_claim_token = NULL,
      reconciliation_claim_expires_at = NULL, sanitized_failure = NULL, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  PERFORM 1
  FROM public.cache_bypasses
  WHERE organization_id = p_organization_id AND site_id = v_site_id FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM public.invalidation_tasks
    WHERE organization_id = p_organization_id AND site_id = v_site_id AND status <> 'completed'
  ) THEN
    INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
    VALUES (p_organization_id, v_site_id, false, 1, 'invalidation_completed', p_now, p_now)
    ON CONFLICT (organization_id, site_id) DO UPDATE
      SET bypass = false, version = public.cache_bypasses.version + 1,
          reason = 'invalidation_completed', updated_at = p_now;
  END IF;
  RETURN true;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
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
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
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
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
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
CREATE OR REPLACE FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[])
 RETURNS TABLE(hostname text, organization_id uuid, domain_id uuid, site_id uuid, region_id uuid, region_external_key text, region_slug text, coherent boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL AND cardinality(p_hostnames) BETWEEN 1 AND 100
          AND array_position(p_hostnames, NULL) IS NULL
        THEN p_hostnames
        ELSE ARRAY[]::text[]
      END
    ) AS supplied(hostname)
    CROSS JOIN LATERAL (
      SELECT lower(trim(trailing '.' FROM supplied.hostname)) AS hostname
    ) normalized
    WHERE normalized.hostname = supplied.hostname
      AND octet_length(normalized.hostname) BETWEEN 1 AND 253
  )
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id, s.region_id,
         r.external_key, r.slug, true
  FROM requested requested_host
  JOIN public.sites s ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN public.domains d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE o.status = 'active' AND d.status = 'active' AND s.status = 'active' AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR (s.region_id IS NOT NULL AND r.status = 'active' AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  INSERT INTO public.cache_bypasses(
    organization_id, site_id, bypass, version, reason, created_at, updated_at
  ) VALUES (
    NEW.organization_id, NEW.site_id, true, 1, 'invalidation_pending', NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true,
        version = public.cache_bypasses.version + 1,
        reason = 'invalidation_pending',
        updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_job_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'retrying', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_target_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN
    IF OLD.state IN ('published', 'failed') THEN
      NEW.finished_at := OLD.finished_at;
      NEW.published_url := OLD.published_url;
      NEW.published_at := OLD.published_at;
      NEW.sanitized_error := OLD.sanitized_error;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing target state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = CASE WHEN p_terminal THEN 'failed'::public.task_status ELSE 'pending'::public.task_status END,
      attempts = attempts + 1, next_attempt_at = p_next_attempt_at,
      reconciliation_claim_token = NULL, reconciliation_claim_expires_at = NULL,
      sanitized_failure = p_failure, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
  VALUES (p_organization_id, v_site_id, true, 1, 'invalidation_failed', p_now, p_now)
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true, version = public.cache_bypasses.version + 1,
        reason = 'invalidation_failed', updated_at = p_now;
  RETURN true;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer)
 RETURNS TABLE(organization_id uuid, job_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT job.organization_id, job.id FROM public.publishing_jobs AS job
  WHERE job.state = 'processing' AND job.lease_expires_at <= requested_now
  ORDER BY job.lease_expires_at, job.id LIMIT LEAST(GREATEST(requested_limit, 1), 100)
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  INSERT INTO public.permissions(id, organization_id, name, scope, description)
  SELECT gen_random_uuid(), p_organization_id, value.name, 'organization'::public.permission_scope, value.description
  FROM (VALUES
    ('api_key.read', 'Read API key metadata'), ('api_key.manage', 'Issue, rotate, and revoke API keys'),
    ('telegram.manage', 'Manage Telegram identity mappings'), ('subscription.read', 'Read Organization subscription'),
    ('subscription.manage', 'Manage Organization subscription')
  ) AS value(name, description)
  ON CONFLICT DO NOTHING
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    indicate_private.current_verified_user_id() = p_actor_id
      AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
      AND EXISTS (
        SELECT 1 FROM public.platform_user_permissions grant_row
        JOIN public.permissions p ON p.id = grant_row.permission_id
        JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
        WHERE grant_row.user_id = p_actor_id
          AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
      ),
    false
  )
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.permission_list_platform(p_user_id uuid)
 RETURNS TABLE(name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '')::uuid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'platform permission lookup denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.name FROM public.platform_user_permissions grant_row
  JOIN public.permissions p ON p.id = grant_row.permission_id
  JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
  WHERE grant_row.user_id = p_user_id AND p.scope = 'platform' AND p.organization_id IS NULL;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.permission_provision_platform(p_user_id uuid, p_permission text, p_provisioned_by text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_permission_id uuid;
BEGIN
  SELECT id INTO v_permission_id FROM public.permissions WHERE scope = 'platform' AND organization_id IS NULL AND name = p_permission;
  IF v_permission_id IS NULL OR length(trim(p_provisioned_by)) < 1 THEN
    RAISE EXCEPTION 'invalid platform permission provisioning request' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'active platform user required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_user_permissions(user_id, permission_id, provisioned_by)
  VALUES (p_user_id, v_permission_id, p_provisioned_by) ON CONFLICT DO NOTHING;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.permission_role_scope_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.permissions p
    WHERE p.id = NEW.permission_id AND p.scope = 'organization' AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'tenant roles may grant only same-organization permissions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET organization_id = p_organization_id, identity_binding_digest = p_identity_binding_digest
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed'
      AND (c.organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (c.identity_binding_digest IS NULL OR c.identity_binding_digest = p_identity_binding_digest)
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c LIMIT 1
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_capture_business_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE
  v_replay_id text; v_body_digest text; v_claim_token uuid;
BEGIN
  IF NEW.request_id NOT LIKE 'telegram-replay:%' THEN RETURN NEW; END IF;
  v_replay_id := split_part(NEW.request_id, ':', 2);
  v_body_digest := split_part(NEW.request_id, ':', 3);
  BEGIN
    v_claim_token := split_part(NEW.request_id, ':', 4)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid replay fence' USING ERRCODE = '42501';
  END;
  IF length(v_body_digest) <> 64 OR split_part(NEW.request_id, ':', 5) <> '' OR NOT EXISTS (
    SELECT 1 FROM public.webhook_replay_claims claim
    WHERE claim.source = 'telegram' AND claim.replay_id = v_replay_id
      AND claim.body_digest = v_body_digest AND claim.claim_token = v_claim_token AND claim.status = 'claimed'
  ) THEN
    RAISE EXCEPTION 'stale replay worker' USING ERRCODE = '42501';
  END IF;
  IF NEW.outcome = 'succeeded' AND NEW.action IN ('article.create', 'article.sites.assign', 'media.activate', 'publication.request') THEN
    UPDATE public.webhook_replay_claims
    SET business_receipt = jsonb_build_object(
      'action', NEW.action, 'targetType', NEW.target_type, 'targetId', NEW.target_id,
      'after', coalesce(NEW.after, '{}'::jsonb), 'occurredAt', NEW.occurred_at
    )
    WHERE source = 'telegram' AND replay_id = v_replay_id
      AND body_digest = v_body_digest AND claim_token = v_claim_token AND status = 'claimed';
  END IF;
  RETURN NEW;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS TABLE(created boolean, source text, replay_id text, organization_id uuid, body_digest text, status replay_claim_status, outcome jsonb, received_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING RETURNING *
  )
  SELECT true, i.source, i.replay_id, i.organization_id, i.body_digest, i.status, i.outcome, i.received_at, i.expires_at FROM inserted i
  UNION ALL
  SELECT false, c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS TABLE(claim_kind text, source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, lease_expires_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_lease_expires_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING RETURNING *
  ), reclaimed AS (
    UPDATE public.webhook_replay_claims c
    SET lease_expires_at = p_lease_expires_at, claim_token = gen_random_uuid(), attempt_count = c.attempt_count + 1
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted)
      AND c.status = 'claimed' AND c.pending_status IS NULL AND c.business_receipt IS NULL
      AND c.lease_expires_at <= p_received_at AND c.expires_at > p_received_at
      AND c.body_digest = p_body_digest
      AND (p_organization_id IS NULL OR c.organization_id IS NULL OR c.organization_id = p_organization_id)
    RETURNING *
  ), selected AS (
    SELECT 'created'::text AS claim_kind, i.* FROM inserted i
    UNION ALL
    SELECT 'reclaimed'::text AS claim_kind, r.* FROM reclaimed r
    UNION ALL
    SELECT 'duplicate'::text AS claim_kind, c.* FROM public.webhook_replay_claims c
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM reclaimed)
  )
  SELECT s.claim_kind, s.source, s.replay_id, s.organization_id, s.body_digest,
    s.identity_binding_digest, s.claim_token, s.business_receipt, s.status, s.pending_status, s.outcome, s.received_at,
    s.lease_expires_at, s.attempt_count, s.expires_at
  FROM selected s LIMIT 1
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET status = c.pending_status, pending_status = NULL, processed_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed' AND c.pending_status IN ('processed', 'rejected') AND c.outcome IS NOT NULL
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token AND c.status IN ('processed', 'rejected') AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, status replay_claim_status, outcome jsonb, received_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims
    SET status = p_status, outcome = p_outcome, processed_at = p_now
    WHERE source = p_source AND replay_id = p_replay_id AND body_digest = p_body_digest AND status = 'claimed'
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF p_status NOT IN ('processed', 'rejected') THEN RETURN; END IF;
  RETURN QUERY
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET pending_status = p_status, outcome = p_outcome, outcome_ready_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed'
      AND (c.pending_status IS NULL OR (c.pending_status = p_status AND c.outcome = p_outcome))
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token AND c.status IN ('processed', 'rejected') AND c.outcome = p_outcome
    AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1;
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
  v_platform := indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.permission_has_tenant(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
CREATE TRIGGER invalidation_tasks_enable_cache_bypass AFTER INSERT ON public.invalidation_tasks FOR EACH ROW EXECUTE FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue();--> statement-breakpoint
CREATE TRIGGER publishing_job_transition_guard BEFORE UPDATE OF state ON public.publishing_jobs FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_publishing_job_transition();--> statement-breakpoint
CREATE TRIGGER publishing_target_transition_guard BEFORE UPDATE OF state ON public.publishing_job_targets FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_publishing_target_transition();--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_list(p_actor_id uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(p_actor_id uuid) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[]) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_function_deadline_seconds integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_function_deadline_seconds integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.permission_list_platform(p_user_id uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.permission_list_platform(p_user_id uuid) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.permission_provision_platform(p_user_id uuid, p_permission text, p_provisioned_by text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.permission_role_scope_guard() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_domains() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_domains() TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_capture_business_receipt() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (33, 'function_api_reconciliation', 'function-api-reconciliation-v1');
