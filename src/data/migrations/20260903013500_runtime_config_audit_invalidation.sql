-- Runtime config audit log and durable invalidation intents.
-- Audit is append-only (trigger + grant revokes below); invalidation supports
-- fenced claim/complete/fail reconcilers (claim token columns).

CREATE TYPE public.config_audit_actor_type AS ENUM ('user', 'api_key', 'telegram', 'system', 'migration');--> statement-breakpoint
CREATE TYPE public.config_audit_outcome AS ENUM ('succeeded', 'denied', 'conflicted', 'failed');--> statement-breakpoint
CREATE TYPE public.invalidation_partition_kind AS ENUM ('shared', 'domain', 'site', 'policy', 'all');--> statement-breakpoint

CREATE TABLE public.runtime_config_audit_logs (
  id uuid PRIMARY KEY,
  organization_id uuid,
  actor_type public.config_audit_actor_type NOT NULL,
  actor_id uuid,
  environment public.runtime_config_environment NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  expected_version integer,
  resulting_version integer,
  changed_fields text[] NOT NULL,
  outcome public.config_audit_outcome NOT NULL,
  request_id text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX runtime_config_audit_org_time_idx ON public.runtime_config_audit_logs (organization_id, occurred_at);--> statement-breakpoint

CREATE TABLE public.runtime_config_invalidation_intents (
  id uuid PRIMARY KEY,
  runtime_revision bigint NOT NULL REFERENCES public.runtime_config_revisions (version) ON DELETE RESTRICT,
  environment public.runtime_config_environment NOT NULL,
  partition_kind public.invalidation_partition_kind NOT NULL,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  claim_token uuid,
  claim_expires_at timestamptz,
  failure_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_config_invalidation_attempts_nonnegative CHECK (attempts >= 0),
  CONSTRAINT runtime_config_invalidation_unique UNIQUE (runtime_revision, partition_kind, organization_id, domain_id, site_id)
);--> statement-breakpoint
CREATE INDEX runtime_config_invalidation_due_idx ON public.runtime_config_invalidation_intents (status, next_attempt_at);--> statement-breakpoint

-- Append-only guard on configuration audit; mirrors the audit_logs pattern.
CREATE OR REPLACE FUNCTION indicate_private.reject_config_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RAISE EXCEPTION 'configuration audit logs are append-only' USING ERRCODE = '42501';
END
$$;--> statement-breakpoint
CREATE TRIGGER runtime_config_audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON public.runtime_config_audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_config_audit_mutation();--> statement-breakpoint

-- Revoke mutation rights on shared tables; reads/writes go through the
-- security-definer functions (added in 0022). Tenant-scoped audit/invalidation
-- rows remain RLS-protected via grant + forced policy.
REVOKE ALL ON TABLE public.runtime_config_audit_logs, public.runtime_config_invalidation_intents
FROM PUBLIC;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.runtime_config_audit_logs,
  public.runtime_config_invalidation_intents FROM indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.runtime_config_audit_logs,
  public.runtime_config_invalidation_intents TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (20, 'runtime_config_audit_invalidation', 'runtime-config-audit-invalidation-v1');