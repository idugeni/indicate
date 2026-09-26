-- Let the revision identity assign its own value.
--
-- Migration 198 removed the enum defect that stopped every runtime-config
-- mutation at its first insert. The next statement was just as unreachable: each
-- function read the revisions sequence with nextval() and then inserted that
-- value into `version`, which has been `bigint GENERATED ALWAYS AS IDENTITY`
-- since the runtime-config core migration. Postgres refuses an explicit value
-- there (428C9), so the functions still could not commit anything, including
-- `mutate_runtime_config_media_policy`, the one mutation the dashboard exposes
-- through `POST /api/dashboard/runtime-config`.
--
-- The repair drops the sequence read, lets the identity column assign the
-- revision, and reads it back with RETURNING, which is also what the
-- invalidation intent has to point at. No other part of the bodies changes.
--
-- The transform is four literal string replacements rather than a rewrite, so
-- each one is checkable on its own: the sequence read goes, `version` leaves the
-- column list, the `v_revision` value leaves the VALUES tuple, and the statement
-- gains its RETURNING clause. The loop then asserts that no function reads the
-- sequence explicitly and that every function writing a revision reads it back,
-- so this migration fails closed instead of leaving a half-repaired catalog.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  target regprocedure;
  mutation_kind text;
  definition text;
  patched integer := 0;
  expected integer;
BEGIN
  SELECT count(*) INTO expected
    FROM pg_proc AS function_entry
    JOIN pg_namespace AS nsp ON nsp.oid = function_entry.pronamespace
   WHERE nsp.nspname = 'indicate_private'
     AND function_entry.prosrc LIKE '%INSERT INTO public.runtime_config_revisions%';
  IF expected = 0 THEN
    RAISE EXCEPTION 'runtime_config_revision_identity_missing: no function writes a revision';
  END IF;
  FOR target, mutation_kind IN
    SELECT function_entry.oid::regprocedure,
           substring(function_entry.prosrc FROM 'now\(\), ''([a-z_]+)''\);')
      FROM pg_proc AS function_entry
      JOIN pg_namespace AS nsp ON nsp.oid = function_entry.pronamespace
     WHERE nsp.nspname = 'indicate_private'
       AND function_entry.prosrc LIKE '%INSERT INTO public.runtime_config_revisions%'
  LOOP
    IF mutation_kind IS NULL THEN
      RAISE EXCEPTION 'runtime_config_revision_identity_unreadable: % revision statement not recognized', target;
    END IF;
    definition := pg_get_functiondef(target);
    definition := replace(
      definition,
      'v_revision := nextval(pg_get_serial_sequence(''public.runtime_config_revisions'', ''version''));',
      ''
    );
    definition := replace(
      definition,
      'INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)',
      'INSERT INTO public.runtime_config_revisions (environment, committed_at, mutation_kind)'
    );
    definition := replace(definition, '(v_revision, ', '(');
    definition := replace(
      definition,
      ', now(), ''' || mutation_kind || ''');',
      ', now(), ''' || mutation_kind || ''') RETURNING version INTO v_revision;'
    );
    definition := replace(definition, 'VALUES ( COALESCE', 'VALUES (COALESCE');
    EXECUTE definition;
    patched := patched + 1;
  END LOOP;
  IF patched <> expected THEN
    RAISE EXCEPTION 'runtime_config_revision_identity_partial: patched % of % revision writers', patched, expected;
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_proc AS function_entry
      JOIN pg_namespace AS nsp ON nsp.oid = function_entry.pronamespace
     WHERE nsp.nspname = 'indicate_private'
       AND function_entry.prosrc LIKE '%nextval(pg_get_serial_sequence(''public.runtime_config_revisions''%'
  ) THEN
    RAISE EXCEPTION 'runtime_config_revision_identity_incomplete: an explicit revision sequence read remains';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_proc AS function_entry
      JOIN pg_namespace AS nsp ON nsp.oid = function_entry.pronamespace
     WHERE nsp.nspname = 'indicate_private'
       AND function_entry.prosrc LIKE '%INSERT INTO public.runtime_config_revisions (version,%'
  ) THEN
    RAISE EXCEPTION 'runtime_config_revision_identity_incomplete: a revision insert still names the identity column';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_proc AS function_entry
      JOIN pg_namespace AS nsp ON nsp.oid = function_entry.pronamespace
     WHERE nsp.nspname = 'indicate_private'
       AND function_entry.prosrc LIKE '%INSERT INTO public.runtime_config_revisions%'
       AND function_entry.prosrc NOT LIKE '%RETURNING version INTO v_revision;%'
  ) THEN
    RAISE EXCEPTION 'runtime_config_revision_identity_incomplete: a revision writer does not read its revision back';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (201, 'runtime_config_revision_identity', 'sha256:b6bd83c9a3822a9caa08f14d4bb73a88da144338a7ef4477b7038283bc4a8d86');
