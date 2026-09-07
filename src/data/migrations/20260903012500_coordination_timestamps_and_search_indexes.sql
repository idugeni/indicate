-- Close three measured gaps: an unusable foreign-key index, coordination tables
-- with no change timestamp, and an unindexable public search path.
--
-- 1. Foreign key index correction.
--
-- 0016 created role_permissions(organization_id, permission_id) to cover the
-- foreign key on permission_id. A composite index only serves a constraint whose
-- first column matches the index's first column, so that index led with the wrong
-- column and the constraint remained uncovered. Every delete or key update on
-- permissions still forced a sequential scan on role_permissions.
CREATE INDEX IF NOT EXISTS role_permissions_permission_lookup_idx
  ON public.role_permissions(permission_id);--> statement-breakpoint

-- 2. Change timestamps on coordination tables.
--
-- These three are among the most frequently written tables in the system:
-- webhook_replay_claims moves through status, pending_status, lease_expires_at,
-- attempt_count and processed_at; seed_runs through status and completed_at;
-- publication_transition_receipts through acknowledged_at and its reconciliation
-- claim fields. None recorded when a row last changed, so the guard added in 0014
-- had no column to protect and operators had no way to spot a stalled lease.
--
-- Existing rows adopt the best durable signal available rather than the migration
-- instant, so a backfilled value never claims a change that did not happen.
ALTER TABLE public.webhook_replay_claims
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();--> statement-breakpoint
UPDATE public.webhook_replay_claims
   SET updated_at = COALESCE(processed_at, lease_expires_at, received_at, updated_at);--> statement-breakpoint

ALTER TABLE public.seed_runs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();--> statement-breakpoint
UPDATE public.seed_runs
   SET updated_at = COALESCE(completed_at, started_at, updated_at);--> statement-breakpoint

ALTER TABLE public.publication_transition_receipts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();--> statement-breakpoint
UPDATE public.publication_transition_receipts
   SET updated_at = COALESCE(acknowledged_at, created_at, updated_at);--> statement-breakpoint

-- Re-attach the freshness guard so the three new columns are covered. Enumerating
-- live columns keeps this correct without a hand-written table list.
DO $reattach$
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
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$reattach$;--> statement-breakpoint

-- 3. Indexable public search.
--
-- The public search surface matches articles.title and articles.body with ILIKE
-- and a leading wildcard. A leading wildcard defeats every btree index, and
-- articles.body holds full article text, so each query scanned the table. The
-- surface is unauthenticated, which makes the cost reachable without an account.
--
-- Trigram GIN indexes serve that predicate. The extension schema differs between
-- Supabase, which keeps extensions out of public, and vanilla PostgreSQL as used
-- in CI, so both the extension and the operator class are resolved dynamically
-- instead of assuming one layout.
DO $extension$
BEGIN
  IF to_regnamespace('extensions') IS NOT NULL THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions';
  ELSE
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
  END IF;
END
$extension$;--> statement-breakpoint

DO $search$
DECLARE opclass_schema text;
BEGIN
  SELECT namespace.nspname INTO opclass_schema
    FROM pg_opclass opclass
    JOIN pg_namespace namespace ON namespace.oid = opclass.opcnamespace
   WHERE opclass.opcname = 'gin_trgm_ops'
   LIMIT 1;
  IF opclass_schema IS NULL THEN
    RAISE EXCEPTION 'pg_trgm operator class unavailable after extension creation';
  END IF;
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS articles_title_trgm_idx ON public.articles USING gin (title %I.gin_trgm_ops)',
    opclass_schema
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS articles_body_trgm_idx ON public.articles USING gin (body %I.gin_trgm_ops)',
    opclass_schema
  );
END
$search$;--> statement-breakpoint

-- Verification. Every foreign key must now have an index whose leading column
-- matches the constraint's leading column, and the three new columns must carry
-- the freshness guard.
DO $verify$
DECLARE uncovered text;
DECLARE unguarded text;
BEGIN
  SELECT string_agg(format('%s(%s)', child.relname, child.attname), ', ') INTO uncovered
    FROM (
      SELECT constraint_class.relname, attribute.attname
        FROM pg_constraint constraint_row
        JOIN pg_class constraint_class ON constraint_class.oid = constraint_row.conrelid
        JOIN pg_namespace constraint_namespace ON constraint_namespace.oid = constraint_class.relnamespace
        JOIN pg_attribute attribute
          ON attribute.attrelid = constraint_row.conrelid
         AND attribute.attnum = constraint_row.conkey[1]
       WHERE constraint_row.contype = 'f'
         AND constraint_namespace.nspname = 'public'
         AND NOT EXISTS (
           SELECT 1 FROM pg_index index_row
            WHERE index_row.indrelid = constraint_row.conrelid
              AND index_row.indkey[0] = constraint_row.conkey[1]
              AND index_row.indpred IS NULL
         )
    ) child;
  IF uncovered IS NOT NULL THEN
    RAISE EXCEPTION 'foreign keys without a usable index: %', uncovered;
  END IF;

  SELECT string_agg(candidate.name, ', ' ORDER BY candidate.name) INTO unguarded
    FROM (VALUES ('webhook_replay_claims'), ('seed_runs'), ('publication_transition_receipts')) AS candidate(name)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_trigger trigger_row
       JOIN pg_class trigger_class ON trigger_class.oid = trigger_row.tgrelid
      WHERE trigger_class.relname = candidate.name
        AND trigger_row.tgname = left(candidate.name || '_touch_updated_at', 63)
        AND NOT trigger_row.tgisinternal
   );
  IF unguarded IS NOT NULL THEN
    RAISE EXCEPTION 'updated_at guard missing for: %', unguarded;
  END IF;
END
$verify$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (18, 'coordination_timestamps_and_search_indexes', 'sha256:18aed7e6f31f9dcc0d2c66571661968d921e6c924ae112d295aa2fd0628ed130');
