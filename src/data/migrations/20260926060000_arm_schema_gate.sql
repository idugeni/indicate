-- Arm the schema gate at this release.
--
-- The gate has been disarmed since it was built, and the database has already
-- drifted once because of it: ledger row 187 (`author_newsroom_profile`) was
-- applied outside this repository, and nothing at boot noticed. A disarmed gate
-- cannot catch the next one either.
--
-- `assertSchemaGate` fails closed when a `required_version` row exists and the
-- applied ledger does not satisfy it, so arming is a real promise: every
-- environment that boots against this database must have migration 197 applied.
-- The version is this migration itself, written in the same transaction as the
-- ledger row, so a fresh environment reaches it by replaying the journal and an
-- already-promoted environment passes the moment the transaction commits.
--
-- A refusal now records its own evidence: the gate writes `actual_version`
-- beside `required_version` and names the ledger's `applied_at` in the error, so
-- the incident answer exists without guesswork. Adjust the floor in a later
-- migration when a release needs it; `AGENTS.md` leaves the arming policy to
-- the release.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.migration_gate_events (id, required_version, actual_version, status)
VALUES (gen_random_uuid(), 197, 197, 'completed'::public.task_status);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (197, 'arm_schema_gate', 'sha256:86a1caf7bce165a57f12c87038f96431ef55adbced88332a8c9062c9721e0531');--> statement-breakpoint
DO $$
DECLARE
  armed integer;
  floor integer;
  applied integer;
BEGIN
  SELECT count(*) INTO armed FROM public.migration_gate_events
   WHERE required_version = 197 AND status = 'completed';
  IF armed <> 1 THEN
    RAISE EXCEPTION 'schema_gate_not_armed: % arming row(s) for 197', armed;
  END IF;
  SELECT max(version) INTO applied FROM public.indicate_schema_migrations;
  SELECT required_version INTO floor FROM public.migration_gate_events
   ORDER BY checked_at DESC, id DESC LIMIT 1;
  IF applied IS NULL OR applied < floor THEN
    RAISE EXCEPTION 'schema_gate_would_block_boot: applied=% required=%', applied, floor;
  END IF;
END;
$$;--> statement-breakpoint
