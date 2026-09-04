-- Rollout tables: immutable release manifest, explicit Domain-to-zone mapping,
-- idempotent backfill accounting, and sanitized parity evidence. Used by the
-- deferred parity/cutover tooling; added now so the schema evolves forward-only
-- before behavior depends on it.

CREATE TABLE public.runtime_config_release_manifests (
  id uuid PRIMARY KEY,
  grammar_version integer NOT NULL,
  parity_start timestamptz NOT NULL,
  parity_end timestamptz NOT NULL,
  legacy_source_version text NOT NULL,
  expected_source_count integer NOT NULL,
  target_schema_version integer NOT NULL,
  candidate_app_version text NOT NULL,
  rollback_app_version text NOT NULL,
  rollback_schema_min integer NOT NULL,
  rollback_schema_max integer NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_config_release_manifests_grammar_positive CHECK (grammar_version > 0),
  CONSTRAINT runtime_config_release_manifests_source_positive CHECK (expected_source_count > 0),
  CONSTRAINT runtime_config_release_manifests_parity_window CHECK ((parity_end - parity_start) <= interval '7 days'),
  CONSTRAINT runtime_config_release_manifests_schema_bounds CHECK (rollback_schema_max >= rollback_schema_min)
);--> statement-breakpoint

CREATE TABLE public.runtime_config_release_domain_zones (
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  domain_id uuid NOT NULL,
  zone_id text NOT NULL,
  PRIMARY KEY (manifest_id, domain_id),
  CONSTRAINT runtime_config_release_domain_zones_zone_unique UNIQUE (zone_id)
);--> statement-breakpoint

CREATE TABLE public.runtime_config_backfill_runs (
  id uuid PRIMARY KEY,
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  source_version text NOT NULL,
  schema_version integer NOT NULL,
  created_count integer NOT NULL,
  updated_count integer NOT NULL,
  unchanged_count integer NOT NULL,
  conflicted_count integer NOT NULL,
  failed_count integer NOT NULL,
  processed_count integer NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  CONSTRAINT runtime_config_backfill_counts_nonnegative CHECK (
    created_count >= 0 AND updated_count >= 0 AND unchanged_count >= 0 AND conflicted_count >= 0 AND failed_count >= 0 AND processed_count >= 0
  ),
  CONSTRAINT runtime_config_backfill_sum CHECK (
    created_count + updated_count + unchanged_count + conflicted_count + failed_count = processed_count
  )
);--> statement-breakpoint

CREATE TABLE public.runtime_config_parity_evidence (
  id uuid PRIMARY KEY,
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  check_name text NOT NULL,
  source_version text NOT NULL,
  persisted_version integer NOT NULL,
  authorized_target_id uuid,
  category text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- Manifests and mapping rows are immutable after insert.
CREATE OR REPLACE FUNCTION indicate_private.reject_rollout_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RAISE EXCEPTION 'runtime config rollout records are immutable' USING ERRCODE = '42501';
END
$$;--> statement-breakpoint
CREATE TRIGGER runtime_config_release_manifests_immutable_guard
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.runtime_config_release_manifests
FOR EACH STATEMENT EXECUTE FUNCTION indicate_private.reject_rollout_mutation();--> statement-breakpoint
CREATE TRIGGER runtime_config_release_domain_zones_immutable_guard
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.runtime_config_release_domain_zones
FOR EACH STATEMENT EXECUTE FUNCTION indicate_private.reject_rollout_mutation();--> statement-breakpoint
CREATE TRIGGER runtime_config_parity_evidence_immutable_guard
BEFORE UPDATE OR DELETE ON public.runtime_config_parity_evidence
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_rollout_mutation();--> statement-breakpoint

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.runtime_config_release_manifests,
  public.runtime_config_release_domain_zones, public.runtime_config_backfill_runs,
  public.runtime_config_parity_evidence FROM indicate_runtime;--> statement-breakpoint
GRANT SELECT ON TABLE public.runtime_config_release_manifests,
  public.runtime_config_release_domain_zones, public.runtime_config_backfill_runs,
  public.runtime_config_parity_evidence TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (21, 'runtime_config_rollout', 'runtime-config-rollout-v1');