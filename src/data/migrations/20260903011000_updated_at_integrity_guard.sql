-- Freshness guard for updated_at.
--
-- Before this migration updated_at was maintained only by application code and
-- SQL functions. Any direct UPDATE that omitted the column silently left a stale
-- timestamp, and nothing in the database refused it.
--
-- The guard deliberately does not force now() unconditionally: this codebase
-- injects an explicit clock (updated_at = p_now) so tests stay deterministic and
-- reconcilers can record the instant they claimed work. Overwriting those values
-- would destroy that control. The trigger therefore only fills the column when
-- the writer left it untouched, so explicit values survive and omissions cannot.
--
-- Triggers are attached by enumerating live columns rather than a hand-written
-- table list, so no table with updated_at can be missed now or later, and the
-- final assertion fails the migration closed if any table remains uncovered.
CREATE OR REPLACE FUNCTION indicate_private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION indicate_private.touch_updated_at() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.touch_updated_at() TO indicate_runtime;--> statement-breakpoint

DO $guard$
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
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$guard$;--> statement-breakpoint

DO $verify$
DECLARE uncovered text;
BEGIN
  SELECT string_agg(candidate.name, ', ' ORDER BY candidate.name) INTO uncovered
    FROM (
      SELECT columns.table_name AS name
        FROM information_schema.columns
        JOIN information_schema.tables
          ON tables.table_schema = columns.table_schema
         AND tables.table_name = columns.table_name
       WHERE columns.table_schema = 'public'
         AND columns.column_name = 'updated_at'
         AND tables.table_type = 'BASE TABLE'
    ) candidate
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_trigger
       JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
       JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_class.relname = candidate.name
        AND pg_trigger.tgname = left(candidate.name || '_touch_updated_at', 63)
        AND NOT pg_trigger.tgisinternal
   );
  IF uncovered IS NOT NULL THEN
    RAISE EXCEPTION 'updated_at guard missing for: %', uncovered;
  END IF;
END
$verify$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (15, 'updated_at_integrity_guard', 'sha256:f2dbac5ae8a410d26f6dd4a55219432416f9b87870eff0b44f9b94de6cedbf39');
