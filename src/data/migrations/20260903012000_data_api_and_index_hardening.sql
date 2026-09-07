-- Close the Supabase Data API surface, correct the updated_at guard, and index
-- the foreign keys that had no usable index.
--
-- 1. Data API exposure.
--
-- Supabase grants table privileges to anon and authenticated by default so that
-- PostgREST can serve the Data API. This application never uses PostgREST: every
-- query runs through Drizzle as indicate_runtime over the pooled connection, and
-- the Supabase client is used only for Auth, which lives in the auth schema with
-- its own roles. The REVOKE ALL ON SCHEMA public FROM PUBLIC issued in 0001 does
-- not remove explicit grants, so anon retained SELECT on all tables.
--
-- That mattered because thirty-two policies were created without a TO clause and
-- therefore apply to every role, and two of their predicates are satisfied without
-- any tenant context:
--   webhook_replay_claims  USING (organization_id IS NULL OR ...)
--   permissions            USING (scope = 'platform' OR ...)
-- With the publishable anon key present in the browser bundle by design, platform
-- scoped rows in those tables were readable by anyone who read the bundle,
-- including body and identity digests and webhook outcomes.
--
-- Revoking the grants removes the surface outright rather than restating thirty-two
-- policies, and it keeps working for tables added later through default privileges.
-- Role names are resolved dynamically because vanilla PostgreSQL, which CI uses,
-- has no anon or authenticated role.
DO $revoke$
DECLARE present text[];
BEGIN
  SELECT coalesce(array_agg(quote_ident(rolname)), ARRAY[]::text[]) INTO present
    FROM pg_roles WHERE rolname IN ('anon', 'authenticated');
  IF cardinality(present) = 0 THEN
    RAISE NOTICE 'no Supabase Data API roles present; nothing to revoke';
    RETURN;
  END IF;

  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %s',
    current_user, array_to_string(present, ', ')
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %s',
    current_user, array_to_string(present, ', ')
  );
END
$revoke$;--> statement-breakpoint

-- 2. updated_at guard correctness.
--
-- 0014 filled updated_at whenever NEW.updated_at matched OLD.updated_at. That
-- predicate cannot tell "the writer omitted the column" from "the writer wrote the
-- same value it already had", because PostgreSQL copies unlisted columns into NEW.
-- An idempotent rewrite that sets updated_at = p_now twice with the same p_now
-- therefore received a real now() on the second write, defeating the injected clock
-- the guard was written to preserve.
--
-- Adding WHEN (OLD.* IS DISTINCT FROM NEW.*) means a write that changes nothing
-- fires nothing, so a repeated identical write leaves the timestamp untouched.
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

-- 3. Foreign keys with no usable index.
--
-- PostgreSQL indexes the referenced side of a foreign key, never the referencing
-- side. These four had no index whose leading column matched the constraint, so
-- every delete or key update on the parent forced a sequential scan on the child.
-- The two permissions indexes that exist are partial and cannot serve a general
-- referential check.
CREATE INDEX IF NOT EXISTS permissions_organization_idx
  ON public.permissions(organization_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_user_permissions_permission_idx
  ON public.platform_user_permissions(permission_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx
  ON public.role_permissions(organization_id, permission_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS webhook_replay_claims_organization_idx
  ON public.webhook_replay_claims(organization_id);--> statement-breakpoint

-- 4. Verification.
--
-- The row level security assertion introduced in 0015 only proved that a policy
-- existed. A table carrying nothing but an INSERT policy, or a policy scoped to a
-- different role, satisfied it while still denying every read to indicate_runtime.
-- This form requires a permissive policy that covers SELECT and either applies to
-- every role or names indicate_runtime.
DO $verify$
DECLARE unreadable text;
DECLARE exposed text;
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
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_policy p
      WHERE p.polrelid = candidate.oid
        AND p.polpermissive
        AND p.polcmd IN ('r', '*')
        AND (p.polroles = '{0}' OR 'indicate_runtime'::regrole::oid = ANY(p.polroles))
   );
  IF unreadable IS NOT NULL THEN
    RAISE EXCEPTION 'no permissive SELECT policy applies to indicate_runtime on: %', unreadable;
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO exposed
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.rolname IN ('anon', 'authenticated')
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND has_table_privilege(r.oid, c.oid, 'SELECT');
  IF exposed IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain SELECT on: %', exposed;
  END IF;
END
$verify$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (17, 'data_api_and_index_hardening', 'sha256:4f9a3e1ea036b75199ddc55863b0c78e7a9831e71617b329d51ea015721e5a89');
