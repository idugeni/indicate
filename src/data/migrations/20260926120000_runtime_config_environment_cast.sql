-- Cast the runtime environment inside the runtime-config mutation functions.
--
-- Every function that commits a runtime-config or site-settings change read the
-- environment from `current_setting('app.environment', true)`, which is `text`,
-- and inserted it straight into the `runtime_config_environment` columns of
-- `runtime_config_revisions`, `runtime_config_audit_logs`, and
-- `runtime_config_invalidation_intents`. Those columns have been the enum since
-- the runtime-config core migration, so each call raised 42804 on its first
-- insert and rolled the whole change back. The admin runtime-config surface
-- could not commit anything, and every production config change so far had to
-- bypass it with hand-written SQL.
--
-- The repair reuses the idiom `20260915020000_media_policy_allow_ico` already
-- established, including its `production` default for an unset setting, and then
-- asserts that no uncast read survives anywhere in the schema, so this migration
-- fails closed instead of leaving a partial repair behind.
--
-- Rewriting the stored source keeps exactly one definition of each function in
-- the catalog; restating eight bodies by hand here would let them drift from the
-- migrations that created them.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  target regprocedure;
  patched integer := 0;
BEGIN
  FOR target IN
    SELECT function_entry.oid::regprocedure
      FROM pg_proc AS function_entry
      JOIN pg_namespace AS nsp ON nsp.oid = function_entry.pronamespace
     WHERE nsp.nspname = 'indicate_private'
       AND function_entry.prosrc LIKE '%current_setting(''app.environment'', true)%'
       AND function_entry.prosrc NOT LIKE '%::public.runtime_config_environment%'
  LOOP
    EXECUTE replace(
      pg_get_functiondef(target),
      'current_setting(''app.environment'', true)',
      'COALESCE(NULLIF(current_setting(''app.environment'', true), ''''), ''production'')::public.runtime_config_environment'
    );
    patched := patched + 1;
  END LOOP;
  IF patched = 0 THEN
    RAISE EXCEPTION 'runtime_config_environment_cast_missing: no uncast environment read found';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_proc AS function_entry
      JOIN pg_namespace AS nsp ON nsp.oid = function_entry.pronamespace
     WHERE nsp.nspname = 'indicate_private'
       AND function_entry.prosrc LIKE '%current_setting(''app.environment'', true)%'
       AND function_entry.prosrc NOT LIKE '%::public.runtime_config_environment%'
  ) THEN
    RAISE EXCEPTION 'runtime_config_environment_cast_incomplete: an uncast environment read remains';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (198, 'runtime_config_environment_cast', 'sha256:2aa56704731ce39b6c2f82eafd3f9f3e33347881a57cd76a78cb2511aaf4c858');
