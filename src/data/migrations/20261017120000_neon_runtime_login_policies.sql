-- Provision the Neon password-bearing runtime login with the same explicit
-- table/function grants and RLS policy targets as the application runtime role.
-- Neon-managed role membership cannot be granted by the project owner role, so
-- this keeps the login role separate and makes the RLS policies name it directly.
-- Body digest: LF-normalize this file and replace its own checksum with zeros.
DO $migration$
DECLARE
  item record;
  role_list text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'indicate_runtime_login') THEN
    RAISE EXCEPTION 'Required Neon login role indicate_runtime_login is missing; provision it before applying this migration';
  END IF;

  REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM indicate_runtime_login;
  REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM indicate_runtime_login;
  REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA indicate_private FROM indicate_runtime_login;

  GRANT USAGE ON SCHEMA public TO indicate_runtime_login;
  GRANT USAGE ON SCHEMA indicate_private TO indicate_runtime_login;

  FOR item IN
    SELECT table_schema, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE grantee = 'indicate_runtime'
      AND table_schema = 'public'
    ORDER BY table_name, privilege_type
  LOOP
    EXECUTE format(
      'GRANT %s ON TABLE %I.%I TO indicate_runtime_login',
      item.privilege_type, item.table_schema, item.table_name
    );
  END LOOP;

  FOR item IN
    SELECT n.nspname AS schema_name, c.relname AS sequence_name, acl.privilege_type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('S', c.relowner))) AS acl
    JOIN pg_roles grantee ON grantee.oid = acl.grantee
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND grantee.rolname = 'indicate_runtime'
    ORDER BY c.relname, acl.privilege_type
  LOOP
    EXECUTE format(
      'GRANT %s ON SEQUENCE %I.%I TO indicate_runtime_login',
      item.privilege_type, item.schema_name, item.sequence_name
    );
  END LOOP;

  FOR item IN
    SELECT n.nspname AS schema_name,
           p.proname AS routine_name,
           pg_get_function_identity_arguments(p.oid) AS identity_arguments,
           acl.privilege_type
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
    JOIN pg_roles grantee ON grantee.oid = acl.grantee
    WHERE n.nspname = 'indicate_private'
      AND grantee.rolname = 'indicate_runtime'
      AND acl.privilege_type = 'EXECUTE'
    ORDER BY p.proname, identity_arguments
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO indicate_runtime_login',
      item.schema_name, item.routine_name, item.identity_arguments
    );
  END LOOP;

  FOR item IN
    SELECT schemaname, tablename, policyname, roles
    FROM pg_policies
    WHERE roles @> ARRAY['indicate_runtime']::name[]
      AND NOT roles @> ARRAY['indicate_runtime_login']::name[]
    ORDER BY schemaname, tablename, policyname
  LOOP
    SELECT string_agg(quote_ident(role_name), ', ' ORDER BY role_name)
      INTO role_list
    FROM (
      SELECT DISTINCT unnest(item.roles || ARRAY['indicate_runtime_login']::name[]) AS role_name
    ) AS policy_roles;

    EXECUTE format(
      'ALTER POLICY %I ON %I.%I TO %s',
      item.policyname, item.schemaname, item.tablename, role_list
    );
  END LOOP;
END
$migration$;--> statement-breakpoint
ALTER ROLE indicate_runtime_login SET statement_timeout = '15s';--> statement-breakpoint
ALTER ROLE indicate_runtime_login SET lock_timeout = '5s';--> statement-breakpoint
ALTER ROLE indicate_runtime_login SET idle_in_transaction_session_timeout = '30s';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (289, 'neon_runtime_login_policies', 'sha256:89a8d2f98d073d4a1fc734e806a8c092d048042146ded105ee0b5d6daf5295b3');
