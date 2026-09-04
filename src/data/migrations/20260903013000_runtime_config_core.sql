-- Runtime config core tables and enums (expand migration, additive).
-- Enums finite; configuration versions positive; singleton guards follow later.

CREATE TYPE public.runtime_config_environment AS ENUM ('development', 'test', 'production');--> statement-breakpoint
CREATE TYPE public.runtime_config_mutation_kind AS ENUM (
  'shared_deployment_config', 'media_policy', 'publication_policy', 'webhook_policy',
  'cache_policy', 'rate_limit_policy', 'domain_provider_mapping', 'site_settings'
);--> statement-breakpoint
CREATE TYPE public.rate_limit_endpoint_class AS ENUM ('mutation', 'webhook', 'public_read');--> statement-breakpoint

CREATE TABLE public.runtime_config_revisions (
  version bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  environment public.runtime_config_environment NOT NULL,
  committed_at timestamptz NOT NULL,
  mutation_kind public.runtime_config_mutation_kind NOT NULL
);--> statement-breakpoint
CREATE INDEX runtime_config_revisions_environment_idx ON public.runtime_config_revisions (environment);--> statement-breakpoint

CREATE TABLE public.shared_deployment_config (
  id text PRIMARY KEY,
  supabase_project_ref text NOT NULL,
  cloudflare_account_id text NOT NULL,
  vercel_project_id text NOT NULL,
  vercel_team_id text NOT NULL,
  vercel_production_target_hostname text NOT NULL,
  r2_account_id text NOT NULL,
  r2_bucket_name text NOT NULL,
  upstash_redis_resource_id text NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT shared_deployment_config_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT shared_deployment_config_version_positive CHECK (version > 0)
);--> statement-breakpoint

CREATE TABLE public.media_policy (
  id text PRIMARY KEY,
  allowed_mime_types text[] NOT NULL,
  max_object_bytes integer NOT NULL,
  upload_authorization_seconds integer NOT NULL,
  read_authorization_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT media_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT media_policy_version_positive CHECK (version > 0),
  CONSTRAINT media_policy_max_bytes_positive CHECK (max_object_bytes > 0),
  CONSTRAINT media_policy_upload_positive CHECK (upload_authorization_seconds > 0),
  CONSTRAINT media_policy_read_positive CHECK (read_authorization_seconds > 0),
  CONSTRAINT media_policy_mimes_nonempty CHECK (cardinality(allowed_mime_types) > 0)
);--> statement-breakpoint

CREATE TABLE public.publication_policy (
  id text PRIMARY KEY,
  max_attempts integer NOT NULL,
  retry_delays_seconds integer[] NOT NULL,
  lease_seconds integer NOT NULL,
  batch_size integer NOT NULL,
  function_deadline_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT publication_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT publication_policy_max_attempts_bounds CHECK (max_attempts BETWEEN 1 AND 10),
  CONSTRAINT publication_policy_lease_bounds CHECK (lease_seconds BETWEEN 10 AND 300),
  CONSTRAINT publication_policy_batch_bounds CHECK (batch_size BETWEEN 1 AND 100),
  CONSTRAINT publication_policy_deadline_bounds CHECK (function_deadline_seconds BETWEEN 10 AND 300),
  CONSTRAINT publication_policy_retry_count CHECK (cardinality(retry_delays_seconds) BETWEEN 1 AND 9),
  CONSTRAINT publication_policy_retry_le_attempts CHECK (cardinality(retry_delays_seconds) <= max_attempts - 1),
  CONSTRAINT publication_policy_version_positive CHECK (version > 0)
);--> statement-breakpoint

CREATE TABLE public.webhook_policy (
  id text PRIMARY KEY,
  freshness_seconds integer NOT NULL,
  replay_retention_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT webhook_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT webhook_policy_freshness_bounds CHECK (freshness_seconds BETWEEN 1 AND 900),
  CONSTRAINT webhook_policy_replay_bounds CHECK (replay_retention_seconds BETWEEN 1 AND 86400),
  CONSTRAINT webhook_policy_replay_ge_freshness CHECK (replay_retention_seconds >= freshness_seconds),
  CONSTRAINT webhook_policy_version_positive CHECK (version > 0)
);--> statement-breakpoint

CREATE TABLE public.cache_policy (
  id text PRIMARY KEY,
  public_cache_seconds integer NOT NULL,
  cache_version integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT cache_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT cache_policy_public_cache_bounds CHECK (public_cache_seconds BETWEEN 0 AND 3600),
  CONSTRAINT cache_policy_cache_version_positive CHECK (cache_version > 0),
  CONSTRAINT cache_policy_version_positive CHECK (version > 0)
);--> statement-breakpoint

CREATE TABLE public.rate_limit_policies (
  endpoint_class public.rate_limit_endpoint_class PRIMARY KEY,
  allowance integer NOT NULL,
  window_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT rate_limit_policies_allowance_positive CHECK (allowance > 0),
  CONSTRAINT rate_limit_policies_window_bounds CHECK (window_seconds BETWEEN 1 AND 3600),
  CONSTRAINT rate_limit_policies_version_positive CHECK (version > 0)
);--> statement-breakpoint

-- Rate-limit allowance caps per endpoint class (hard safety caps).
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_mutation_cap CHECK (
    endpoint_class <> 'mutation' OR allowance <= 1000
  );--> statement-breakpoint
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_webhook_cap CHECK (
    endpoint_class <> 'webhook' OR allowance <= 2000
  );--> statement-breakpoint
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_public_read_cap CHECK (
    endpoint_class <> 'public_read' OR allowance <= 10000
  );--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (19, 'runtime_config_core', 'runtime-config-core-v1');