-- Drop the vestigial replay outcome reference.
--
-- `webhook_replay_claims` keeps the replay outcome in three places that are all
-- live: the `outcome` payload, `processed_at`, and `outcome_ready_at`, which
-- `prepareReplayOutcome`, `finalizeReplay`, and `completeReplay` maintain and
-- `mapRawClaim` reads. `outcome_reference` was left over from an earlier design
-- where the outcome lived somewhere else and the row only pointed at it. Nothing
-- writes it, nothing reads it, and all existing rows hold NULL, so it is a
-- column that only ever invites the question "what is this for?".
--
-- The guard asserts the column is empty before dropping it, so a future write
-- path cannot be silently truncated, and it re-checks that the replay surface
-- the application actually reads still resolves.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  populated integer;
BEGIN
  SELECT count(*) INTO populated FROM public.webhook_replay_claims
   WHERE outcome_reference IS NOT NULL AND btrim(outcome_reference) <> '';
  IF populated > 0 THEN
    RAISE EXCEPTION 'outcome_reference_not_vestigial: % replay claim(s) carry a value', populated;
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE public.webhook_replay_claims DROP COLUMN outcome_reference;--> statement-breakpoint
DO $$
DECLARE
  survivors integer;
  unreadable integer;
BEGIN
  SELECT count(*) INTO survivors
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'webhook_replay_claims'
     AND column_name = 'outcome_reference';
  IF survivors > 0 THEN
    RAISE EXCEPTION 'outcome_reference_survived: the column is still present';
  END IF;
  SELECT count(*) INTO unreadable
    FROM public.webhook_replay_claims AS claim
   WHERE claim.pending_status IS NOT NULL
     AND (claim.processed_at IS NULL OR claim.outcome_ready_at IS NULL);
  IF unreadable > 0 THEN
    RAISE EXCEPTION 'outcome_reference_broke_replays: % terminal claim(s) lost their outcome timestamps', unreadable;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (195, 'drop_vestigial_replay_outcome_reference', 'sha256:73d3ecea6d1f35dd4318dff75908a2a871aea08532f07b5a082a84b8882c90f6');
