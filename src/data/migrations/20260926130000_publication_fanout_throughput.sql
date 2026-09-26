-- Raise publication throughput to the network fan-out ceiling.
--
-- A publication job drains at most `batch_size` targets per worker invocation
-- and the worker only runs on a cron, so those two are the entire throughput
-- budget: the configured 50-second function deadline was never the binding
-- constraint, because ten targets finish in a few seconds and the run stops on
-- the batch, not on the clock. Publishing to every active portal therefore
-- needed about 37 hours at the previous settings, while the same sweep costs
-- roughly one to three dollars of Vercel usage and the cron change adds about
-- 27 cents a month, so there is nothing to trade away for speed here.
--
-- The three values keep a full batch inside one invocation while the lease
-- stays longer than the run it protects, so a worker that dies mid-batch is
-- repaired by reconciliation instead of losing its fence:
--
--   batch_size               10 -> 100   the column's own upper bound
--   lease_seconds            30 -> 300   longer than any run this size implies
--   function_deadline_seconds 50 -> 100  still under the route's 120 s ceiling
--
-- The lease is deliberately the maximum the column allows. Recovery of a crashed
-- job is bounded by the reconciliation cron rather than by the lease length, so
-- a longer lease costs nothing and removes the `stale_fence` failure mode that a
-- hundred-target run would otherwise hit at the old 30 seconds.
--
-- The bookkeeping below mirrors `mutate_runtime_config_publication_policy`
-- because that function cannot be used yet: migration 198 removed its enum
-- defect, and its remaining defect is inserting an explicit value into the
-- `GENERATED ALWAYS AS IDENTITY` revision column. Recording the change here
-- keeps a full audit trail and invalidation intent, and keeps a fresh
-- environment on the same throughput as production.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  resulting integer;
  revision bigint;
BEGIN
  UPDATE public.publication_policy AS policy
     SET batch_size = 100, lease_seconds = 300, function_deadline_seconds = 100,
         version = version + 1, updated_at = now()
   WHERE policy.singleton_key = 'singleton'
  RETURNING policy.version INTO resulting;
  IF resulting IS NULL THEN
    RAISE EXCEPTION 'publication_policy_missing: singleton row not found';
  END IF;
  INSERT INTO public.runtime_config_revisions (environment, committed_at, mutation_kind)
  VALUES ('production', now(), 'publication_policy')
  RETURNING version INTO revision;
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'migration', NULL, 'production', 'update', 'publication_policy',
    NULL, resulting - 1, resulting,
    ARRAY['batch_size', 'lease_seconds', 'function_deadline_seconds'],
    'succeeded', 'migration:199:publication_fanout_throughput'
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), revision, 'production', 'policy', 'pending', 0, now());
END;
$$;--> statement-breakpoint
DO $$
DECLARE
  policy public.publication_policy%ROWTYPE;
BEGIN
  SELECT * INTO policy FROM public.publication_policy WHERE singleton_key = 'singleton';
  IF policy.batch_size <> 100 OR policy.lease_seconds <> 300 OR policy.function_deadline_seconds <> 100 THEN
    RAISE EXCEPTION 'publication_policy_throughput_not_applied: %', policy.version;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.runtime_config_audit_logs
     WHERE target_type = 'publication_policy' AND actor_type = 'migration'
       AND request_id = 'migration:199:publication_fanout_throughput'
  ) THEN
    RAISE EXCEPTION 'publication_policy_audit_missing';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (199, 'publication_fanout_throughput', 'sha256:20f3be28302c3fc53999bd1390f70e00f61ec431930a5839d8a9cf7561fd76f0');
