-- Record the provenance of the 60 publishers that were provisioned outside the
-- application layer, so the audit trail stops contradicting the data.
--
-- `hygiene:publishers` flags a verified, active publisher with no audit row as
-- something the application layer would never produce, and it was right: the 59
-- unit publishers and the platform publisher were written by a bulk load, not by
-- the dashboard. The rows claim `verification_status = 'verified'`, which the
-- application only ever sets after a membership-backed verification, so the
-- verified state currently has no evidence behind it.
--
-- This records what actually happened rather than inventing an approval. The
-- actor is `system`, the entry point is `worker`, and the action names the real
-- mechanism, so the row documents an out-of-band load instead of fabricating a
-- human decision that never occurred. `after` carries the batch the row came
-- from so the original timestamp survives in the record even though the chain
-- trigger overwrites `occurred_at` with the moment of writing.
--
-- The insert is additive and idempotent: a publisher that already has a trail is
-- skipped, so re-running the migration cannot duplicate history. The table is
-- append-only, and the chain trigger signs each row as it lands.
--
-- This does not make the load legitimate. It makes the gap visible and dated,
-- which is the part a reader of the audit log can act on.

DO $migration$
DECLARE
  untrailed integer;
  to_record integer;
BEGIN
  SELECT count(*) INTO untrailed
  FROM public.publishers AS publisher
  WHERE publisher.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.audit_logs AS log
      WHERE log.target_type = 'publisher'
        AND log.target_id = publisher.id::text
    );

  SELECT count(*) INTO to_record
  FROM public.publishers;

  IF untrailed <> to_record THEN
    RAISE EXCEPTION
      'publisher_provenance_partial: % of % active publishers still lack a trail',
      untrailed, to_record;
  END IF;

  INSERT INTO public.audit_logs (
    organization_id,
    id,
    actor_type,
    actor_id,
    entry_point,
    action,
    target_type,
    target_id,
    outcome,
    changed_fields,
    before,
    after,
    request_id
  )
  SELECT
    publisher.organization_id,
    gen_random_uuid(),
    'system',
    'db:publisher-provenance',
    'worker',
    'publisher.provisioned_out_of_band',
    'publisher',
    publisher.id::text,
    'succeeded',
    ARRAY['status', 'verification_status'],
    NULL,
    jsonb_build_object(
      'name', publisher.name,
      'type', publisher.type,
      'verification_status', publisher.verification_status,
      'provenance', 'bulk-load-outside-application',
      'evidence_reference', publisher.evidence_reference,
      'provisioned_at', publisher.created_at
    ),
    'db:publisher-provenance'
  FROM public.publishers AS publisher
  WHERE publisher.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.audit_logs AS log
      WHERE log.target_type = 'publisher'
        AND log.target_id = publisher.id::text
    );
END
$migration$;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (214, 'publisher_provenance_audit', 'sha256:d77e774f15e1aa349f9c82be2e0c9fffbe62039d243b51bebb3a083c1b9aeff3');
