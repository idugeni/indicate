-- Drop the retired runtime-config release governance tables.
--
-- A column-by-column audit of the live database against the application found
-- five tables that no code touches at all: not a Drizzle query, not a raw SQL
-- string, not a trigger, not a view, and not a function in `public` or
-- `indicate_private`. They are the release manifest, the domain-zone mapping,
-- the parity evidence, the backfill run accounting, and the seed run ledger,
-- which together implemented a manifest-driven cutover process that
-- `shared_deployment_config` plus `runtime_config_revisions` replaced.
--
-- All five hold zero rows, and they form a closed foreign-key cluster: the
-- three children reference the manifest with ON DELETE CASCADE and nothing
-- outside the cluster points at any of them. The guard below refuses the drop
-- if any of that is no longer true, so the migration is safe to replay and
-- fails loudly rather than silently losing a row.
--
-- The definitions stay in `20260903000000_core_schema.sql`, so the mechanism can
-- be rebuilt from history if a future release ever needs manifest-driven
-- cutover again.
--
-- What deliberately stays: `runtime_config_revisions`,
-- `runtime_config_audit_logs`, and `runtime_config_invalidation_intents` are
-- live (8, 1, and 2 rows) and read by the runtime-config path; the moderation
-- and privacy decision columns are reserved for features that are not wired
-- yet; `audit_logs.prev_hash` belongs to the database-side hash chain.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  manifests integer;
  zones integer;
  parity integer;
  backfills integer;
  seeds integer;
  foreign_refs integer;
BEGIN
  SELECT count(*) INTO manifests FROM public.runtime_config_release_manifests;
  SELECT count(*) INTO zones FROM public.runtime_config_release_domain_zones;
  SELECT count(*) INTO parity FROM public.runtime_config_parity_evidence;
  SELECT count(*) INTO backfills FROM public.runtime_config_backfill_runs;
  SELECT count(*) INTO seeds FROM public.seed_runs;
  IF manifests + zones + parity + backfills + seeds > 0 THEN
    RAISE EXCEPTION
      'retired_tables_not_empty: manifests=% zones=% parity=% backfills=% seeds=%',
      manifests, zones, parity, backfills, seeds;
  END IF;
  SELECT count(*) INTO foreign_refs
    FROM pg_constraint
   WHERE confrelid IN (
     'public.runtime_config_release_manifests'::regclass,
     'public.runtime_config_release_domain_zones'::regclass,
     'public.runtime_config_parity_evidence'::regclass,
     'public.runtime_config_backfill_runs'::regclass,
     'public.seed_runs'::regclass
   );
  IF foreign_refs > 3 THEN
    RAISE EXCEPTION 'retired_tables_still_referenced: % foreign key(s) point at the retired cluster', foreign_refs;
  END IF;
END;
$$;--> statement-breakpoint
DROP TABLE public.runtime_config_release_domain_zones;--> statement-breakpoint
DROP TABLE public.runtime_config_parity_evidence;--> statement-breakpoint
DROP TABLE public.runtime_config_backfill_runs;--> statement-breakpoint
DROP TABLE public.runtime_config_release_manifests;--> statement-breakpoint
DROP TABLE public.seed_runs;--> statement-breakpoint
DROP TYPE public.seed_run_status;--> statement-breakpoint
DO $$
DECLARE
  survivors integer;
BEGIN
  SELECT count(*) INTO survivors
    FROM pg_class
   WHERE relkind = 'r'
     AND relnamespace = 'public'::regnamespace
     AND relname IN (
       'runtime_config_release_manifests', 'runtime_config_release_domain_zones',
       'runtime_config_parity_evidence', 'runtime_config_backfill_runs', 'seed_runs'
     );
  IF survivors > 0 THEN
    RAISE EXCEPTION 'retired_tables_survived: % table(s) still present', survivors;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE n.nspname = 'public' AND t.typname = 'seed_run_status') THEN
    RAISE EXCEPTION 'retired_tables_survived: seed_run_status type still present';
  END IF;
  IF to_regclass('public.runtime_config_revisions') IS NULL
     OR to_regclass('public.runtime_config_audit_logs') IS NULL
     OR to_regclass('public.runtime_config_invalidation_intents') IS NULL THEN
    RAISE EXCEPTION 'retired_tables_broke_live_config: a live runtime-config table went missing';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (191, 'retire_release_governance_tables', 'sha256:4c80e8e3a6f6c1e51b4852aa20b50f8b3de812e6afd083811d13dfbaaa23c4e1');
