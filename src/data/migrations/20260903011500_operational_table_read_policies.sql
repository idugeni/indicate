-- Restore the schema gate's read path on Supabase.
--
-- Supabase installs an event trigger named ensure_rls on ddl_command_end that
-- enables row level security on every table created in the public schema. Two of
-- this schema's tables are operational rather than tenant-scoped and therefore
-- never received a policy in 0001: indicate_schema_migrations and
-- migration_gate_events. Row level security with no policy denies every row, so
-- the GRANT SELECT issued in 0001 became inert and the runtime role observed an
-- empty ledger.
--
-- The visible consequence was that `db:check` reported actualVersion null and the
-- production readiness schema_version check could never pass, while remaining
-- green in CI because vanilla PostgreSQL has no such event trigger. The defect was
-- therefore invisible on every platform except the one that matters.
--
-- Both tables hold no tenant data, and 0001 already revoked INSERT, UPDATE,
-- DELETE, and TRUNCATE on them from indicate_runtime, so a read-only policy
-- scoped to that role restores the gate without widening write authority. Row
-- level security stays enabled so the tables keep failing closed for every other
-- role, including anon and authenticated.
DROP POLICY IF EXISTS indicate_runtime_read ON public.indicate_schema_migrations;--> statement-breakpoint
CREATE POLICY indicate_runtime_read ON public.indicate_schema_migrations
  FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint

DROP POLICY IF EXISTS indicate_runtime_read ON public.migration_gate_events;--> statement-breakpoint
CREATE POLICY indicate_runtime_read ON public.migration_gate_events
  FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint

-- Guard against the same class of defect returning. Any future public table that
-- the runtime role can select from must either carry a policy or lose the grant,
-- otherwise its reads silently return nothing.
DO $verify$
DECLARE unreadable text;
BEGIN
  SELECT string_agg(candidate.relname, ', ' ORDER BY candidate.relname) INTO unreadable
    FROM (
      SELECT c.oid, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relrowsecurity
         AND has_table_privilege('indicate_runtime', c.oid, 'SELECT')
    ) candidate
   WHERE NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = candidate.oid);
  IF unreadable IS NOT NULL THEN
    RAISE EXCEPTION 'row level security denies every row for indicate_runtime on: %', unreadable;
  END IF;
END
$verify$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (16, 'operational_table_read_policies', 'sha256:aeb5fcff577a43bdd81ccf7ff767e838d2cc7c0ac0a35f1306b137b042f3a599');
