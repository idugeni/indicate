-- Fase 0: AI control-plane schema (full-DB, no new env).
--
-- Seven tables reverse-modelled from the reference AI pool (credential records
-- with health telemetry, rotation policy, model directory, request telemetry,
-- insight triage, DB-only master secret):
--   ai_providers, ai_models, ai_credentials, ai_routing_policies,
--   ai_request_logs (append-only), ai_query_insights, ai_master_secrets.
-- ai_credentials.organization_id NULL means a platform-global pooled key.
--
-- Envelope is AES-256 via pgcrypto OpenPGP (`pgp_sym_encrypt`), keyed by the
-- single active ai_master_secrets row. The application never reads that row:
-- only indicate_private.encrypt_ai_key / decrypt_ai_key (SECURITY DEFINER,
-- EXECUTE to indicate_runtime) touch it, and the table carries no policy and
-- no grant, so every other role is denied by default. No master value is
-- seeded here; provisioning happens out of band and both functions fail closed
-- while no active row exists.
--
-- ai_request_logs is insert-only: SELECT + INSERT policies and grants only, no
-- UPDATE or DELETE anywhere. The remaining five tables follow the internal
-- config pattern (sole runtime_accessor policy TO indicate_runtime). Seeds
-- below hold no secrets: one provider, the model directory, and the default
-- rotation row, all ON CONFLICT DO NOTHING for replay safety.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $extension$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto';
  END;
END
$extension$;--> statement-breakpoint
DO $types$
BEGIN
  CREATE TYPE public.ai_credential_status AS ENUM ('active', 'inactive', 'disabled', 'exhausted', 'invalid', 'cooldown');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$types$;--> statement-breakpoint
DO $types$
BEGIN
  CREATE TYPE public.ai_rotation_strategy AS ENUM ('round_robin', 'random', 'least_used', 'lowest_error_rate', 'priority_based', 'health_aware');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$types$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_providers_priority_nonnegative CHECK (priority >= 0)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_models (
  id text PRIMARY KEY,
  provider_id text NOT NULL REFERENCES public.ai_providers(id) ON DELETE RESTRICT,
  model_name text NOT NULL,
  display_name text NOT NULL,
  description text NULL,
  context_window integer NOT NULL,
  input_token_limit integer NULL,
  output_token_limit integer NULL,
  supported_modalities text[] NOT NULL,
  release_stage text NULL,
  rpm_limit integer NULL,
  tpm_limit integer NULL,
  rpd_limit integer NULL,
  task_recommendation text NULL,
  supports_tools boolean NOT NULL DEFAULT false,
  supports_vision boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_models_provider_model_unique UNIQUE (provider_id, model_name),
  CONSTRAINT ai_models_window_positive CHECK (context_window > 0),
  CONSTRAINT ai_models_priority_nonnegative CHECK (priority >= 0)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_id text NOT NULL REFERENCES public.ai_providers(id) ON DELETE RESTRICT,
  label text NOT NULL,
  key_encrypted text NOT NULL,
  key_masked text NOT NULL,
  status public.ai_credential_status NOT NULL DEFAULT 'active',
  priority integer NOT NULL DEFAULT 1,
  weight integer NOT NULL DEFAULT 100,
  cooldown_until timestamp with time zone NULL,
  last_used_at timestamp with time zone NULL,
  last_success_at timestamp with time zone NULL,
  last_failure_at timestamp with time zone NULL,
  last_error_message text NULL,
  last_error_class text NULL,
  total_requests integer NOT NULL DEFAULT 0,
  successful_requests integer NOT NULL DEFAULT 0,
  failed_requests integer NOT NULL DEFAULT 0,
  rate_limit_count integer NOT NULL DEFAULT 0,
  quota_exhausted_count integer NOT NULL DEFAULT 0,
  avg_latency_ms integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_credentials_label_length CHECK (length(label) BETWEEN 1 AND 200),
  CONSTRAINT ai_credentials_priority_positive CHECK (priority >= 1),
  CONSTRAINT ai_credentials_weight_nonnegative CHECK (weight >= 0),
  CONSTRAINT ai_credentials_counters_nonnegative CHECK (total_requests >= 0 AND successful_requests >= 0 AND failed_requests >= 0 AND rate_limit_count >= 0 AND quota_exhausted_count >= 0 AND avg_latency_ms >= 0)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_routing_policies (
  id text PRIMARY KEY,
  rotation_strategy public.ai_rotation_strategy NOT NULL DEFAULT 'health_aware',
  primary_provider_id text NULL REFERENCES public.ai_providers(id) ON DELETE RESTRICT,
  fallback_provider_id text NULL REFERENCES public.ai_providers(id) ON DELETE RESTRICT,
  default_model text NOT NULL,
  fallback_model text NOT NULL,
  max_retries integer NOT NULL DEFAULT 5,
  per_key_retry_limit integer NOT NULL DEFAULT 2,
  cooldown_duration_sec integer NOT NULL DEFAULT 60,
  request_timeout_ms integer NOT NULL DEFAULT 60000,
  global_concurrency_limit integer NOT NULL DEFAULT 100,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_routing_policies_singleton CHECK (id = 'default'),
  CONSTRAINT ai_routing_policies_retry_bounds CHECK (max_retries BETWEEN 1 AND 10 AND per_key_retry_limit BETWEEN 1 AND 5),
  CONSTRAINT ai_routing_policies_cooldown_bounds CHECK (cooldown_duration_sec BETWEEN 10 AND 3600),
  CONSTRAINT ai_routing_policies_timeout_bounds CHECK (request_timeout_ms BETWEEN 1000 AND 300000),
  CONSTRAINT ai_routing_policies_concurrency_bounds CHECK (global_concurrency_limit BETWEEN 1 AND 1000),
  CONSTRAINT ai_routing_policies_version_positive CHECK (version > 0)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NULL,
  channel text NOT NULL DEFAULT 'web',
  provider_id text NOT NULL,
  model_name text NOT NULL,
  credential_id uuid NULL REFERENCES public.ai_credentials(id) ON DELETE SET NULL,
  status text NOT NULL,
  retry_count integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  tools_executed text[] NULL,
  error_class text NULL,
  error_message text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_request_logs_status_known CHECK (status IN ('success', 'failed', 'blocked')),
  CONSTRAINT ai_request_logs_counters_nonnegative CHECK (retry_count >= 0 AND latency_ms >= 0 AND prompt_tokens >= 0 AND completion_tokens >= 0 AND total_tokens >= 0)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_query_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  channel text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'open',
  feedback_reason text NULL,
  model_used text NULL,
  suggested_action text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_query_insights_query_length CHECK (length(query) BETWEEN 1 AND 1000)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_master_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  rotated_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_master_secrets_secret_length CHECK (length(secret) >= 32),
  CONSTRAINT ai_master_secrets_version_positive CHECK (version > 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ai_master_secrets_single_active_unique ON public.ai_master_secrets (is_active) WHERE is_active = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_models_provider_idx ON public.ai_models (provider_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_credentials_provider_status_priority_idx ON public.ai_credentials (provider_id, status, priority);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_credentials_cooldown_idx ON public.ai_credentials (cooldown_until);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_credentials_org_provider_idx ON public.ai_credentials (organization_id, provider_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_request_logs_created_status_idx ON public.ai_request_logs (created_at, status);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_request_logs_credential_idx ON public.ai_request_logs (credential_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_query_insights_created_idx ON public.ai_query_insights (created_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_query_insights_status_idx ON public.ai_query_insights (status);--> statement-breakpoint
INSERT INTO public.ai_providers (id, name, description, is_active, is_primary, priority, created_at, updated_at)
VALUES ('gemini', 'Google Gemini', 'Google AI Studio generative models', true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.ai_models (id, provider_id, model_name, display_name, description, context_window, output_token_limit, supported_modalities, rpm_limit, tpm_limit, task_recommendation, supports_tools, supports_vision, is_default, is_active, priority, created_at, updated_at)
VALUES
  ('gemini-3.7-flash', 'gemini', 'gemini-3.7-flash', 'Gemini 3.7 Flash', 'Heavy regulatory analysis and hybrid reasoning', 2097152, 65536, ARRAY['text'], 15, 1000000, 'heavy analysis', true, true, false, true, 30, now(), now()),
  ('gemini-3.6-flash', 'gemini', 'gemini-3.6-flash', 'Gemini 3.6 Flash', 'Default public chat workhorse', 1048576, 65536, ARRAY['text'], 15, 1000000, 'default chat', true, true, true, true, 10, now(), now()),
  ('gemini-2.5-pro', 'gemini', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 'Annual document deep dives', 2097152, 65536, ARRAY['text'], 2, 32000, 'document review', true, true, false, true, 40, now(), now()),
  ('gemini-2.5-flash', 'gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 'Secondary failover engine', 1048576, 65536, ARRAY['text'], 15, 1000000, 'failover', true, true, false, true, 20, now(), now()),
  ('gemini-3.1-flash-lite', 'gemini', 'gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite', 'Metadata extraction and auto-tagging', 1048576, 65536, ARRAY['text'], 30, 2000000, 'extraction', true, true, false, true, 50, now(), now()),
  ('deep-research-preview', 'gemini', 'deep-research-preview', 'Deep Research Agent', 'Autonomous complaint investigation research', 1048576, 65536, ARRAY['text'], 5, 200000, 'research', true, false, false, true, 60, now(), now()),
  ('gemini-embedding-2', 'gemini', 'gemini-embedding-2', 'Gemini Embedding 2', 'Multimodal vector embedding', 8192, NULL, ARRAY['text', 'image'], 60, 5000000, 'embeddings', false, false, false, true, 70, now(), now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.ai_routing_policies (id, rotation_strategy, primary_provider_id, fallback_provider_id, default_model, fallback_model, max_retries, per_key_retry_limit, cooldown_duration_sec, request_timeout_ms, global_concurrency_limit, version, updated_at)
VALUES ('default', 'health_aware', 'gemini', NULL, 'gemini-2.5-flash', 'gemini-2.5-flash', 5, 2, 60, 60000, 100, 1, now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_providers FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON public.ai_providers;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.ai_providers FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.ai_providers FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_providers TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_models FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON public.ai_models;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.ai_models FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.ai_models FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.ai_credentials ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_credentials FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON public.ai_credentials;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.ai_credentials FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.ai_credentials FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_credentials TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON public.ai_routing_policies;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.ai_routing_policies FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.ai_routing_policies FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_routing_policies TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_request_logs FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_insert ON public.ai_request_logs;--> statement-breakpoint
CREATE POLICY runtime_insert ON public.ai_request_logs FOR INSERT TO indicate_runtime WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS runtime_select ON public.ai_request_logs;--> statement-breakpoint
CREATE POLICY runtime_select ON public.ai_request_logs FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
REVOKE ALL ON public.ai_request_logs FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT ON public.ai_request_logs TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.ai_query_insights ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_query_insights FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON public.ai_query_insights;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.ai_query_insights FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.ai_query_insights FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_query_insights TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.ai_master_secrets ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_master_secrets FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON public.ai_master_secrets FROM PUBLIC;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.encrypt_ai_key(p_plain text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_master text;
BEGIN
  IF p_plain IS NULL OR p_plain = '' THEN
    RETURN '';
  END IF;
  SELECT secret INTO v_master FROM public.ai_master_secrets WHERE is_active = true ORDER BY version DESC LIMIT 1;
  IF v_master IS NULL THEN
    RAISE EXCEPTION 'ai master secret not provisioned' USING ERRCODE = '42501';
  END IF;
  RETURN encode(pgp_sym_encrypt(p_plain, v_master), 'base64');
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.encrypt_ai_key(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.encrypt_ai_key(text) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.decrypt_ai_key(p_cipher text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_master text;
BEGIN
  IF p_cipher IS NULL OR p_cipher = '' THEN
    RETURN '';
  END IF;
  SELECT secret INTO v_master FROM public.ai_master_secrets WHERE is_active = true ORDER BY version DESC LIMIT 1;
  IF v_master IS NULL THEN
    RAISE EXCEPTION 'ai master secret not provisioned' USING ERRCODE = '42501';
  END IF;
  RETURN pgp_sym_decrypt(decode(p_cipher, 'base64'), v_master)::text;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.decrypt_ai_key(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.decrypt_ai_key(text) TO indicate_runtime;--> statement-breakpoint
DO $touch$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT columns.table_name AS name
      FROM information_schema.columns
      JOIN information_schema.tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
     WHERE columns.table_schema = 'public'
       AND columns.column_name = 'updated_at'
       AND tables.table_type = 'BASE TABLE'
       AND columns.table_name LIKE 'ai\_%'
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$touch$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (222, 'ai_control_plane', 'sha256:dcd23fc402dc8819ed56c97b6a263302d6d322006b0d6ee5c8e8b3c8360afc14');
