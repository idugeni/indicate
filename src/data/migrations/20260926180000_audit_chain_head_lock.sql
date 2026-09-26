-- Serialize the audit hash-chain head so overlapping inserts cannot fork it.
--
-- `indicate_private.audit_chain_fill` read the chain head with
-- `SELECT signature ... ORDER BY seq DESC LIMIT 1 FOR UPDATE`. `FOR UPDATE` locks
-- the row it reads, not the position in that ordering, so two audit inserts that
-- overlap inside the same window could both observe the same head and then write
-- two rows carrying an identical `prev_hash`. The chain forks: the later row's
-- link no longer matches its predecessor's signature, and `audit_verify_chain`
-- reports it.
--
-- Six such forks exist. All are `media.access.authorize` rows written by the
-- system actor between 2026-09-16 and 2026-09-17, each sharing its `prev_hash`
-- with exactly one neighbour. Their payloads and signatures are intact — the
-- HMAC over the stored row still reproduces — so the link is wrong and nothing
-- else is. That makes this an ordering defect rather than data corruption, and
-- it stays invisible until someone reads the chain instead of the rows.
--
-- A transaction-level advisory lock taken before the head read makes the whole
-- read-then-write sequence exclusive across sessions, which is what a single
-- linear chain actually requires. `pg_advisory_xact_lock` is released when the
-- transaction ends, so neither a commit nor a rollback can strand it. Once that
-- lock is held the `FOR UPDATE` is redundant, and dropping it leaves one locking
-- mechanism instead of two that look sufficient but are not.
--
-- The lock lives until the inserting transaction ends, so audit appends now
-- serialize globally rather than per organization. Audit volume is a handful of
-- small rows per operation and the wait is short, which is a fair price for a
-- chain that verifies. Deadlock is still possible in principle if a transaction
-- takes the advisory lock here and then waits on a business-row lock another
-- audit-writing transaction already holds; Postgres detects that and aborts one,
-- so the failure is loud and retryable rather than a silent fork.
--
-- The rows that are already unverifiable stay as they are. Re-signing the chain
-- would turn `audit_verify_chain` green by rewriting the very history these six
-- forks are evidence of, and a chain that verifies because it was re-signed says
-- less than one that verifies and is honest about its past.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.audit_chain_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_prev text; v_key text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('indicate.audit_chain_head'));
  SELECT signature INTO v_prev FROM public.audit_logs ORDER BY seq DESC LIMIT 1;
  NEW.occurred_at := clock_timestamp();
  NEW.prev_hash := v_prev;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  NEW.signature := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(NEW), NEW.prev_hash), v_key, 'sha256'), 'hex');
  RETURN NEW;
END
$function$;--> statement-breakpoint
DO $$
DECLARE
  body text;
BEGIN
  body := pg_get_functiondef('indicate_private.audit_chain_fill()'::regprocedure);
  IF position('pg_advisory_xact_lock' in body) = 0 THEN
    RAISE EXCEPTION 'audit_chain_head_lock_missing: head is still read without the advisory lock';
  END IF;
  IF position('FOR UPDATE' in upper(body)) > 0 THEN
    RAISE EXCEPTION 'audit_chain_head_lock_redundant: FOR UPDATE still present alongside the advisory lock';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (204, 'audit_chain_head_lock', 'sha256:bbab7baa060fd1a05855aac525b0b049b9075db1332df326e0b495a46e2b3c5d');
