-- F78: klaim antrean aktivasi domain yang hilang.
--
-- Kode memanggil indicate_private.claim_delivery_activation_attempts(...)
-- (delivery.ts claimActivationAttempts via domain-provisioning-service reconciler),
-- tetapi fungsi tersebut tidak pernah dibuat oleh migrasi mana pun: setiap putaran
-- reconciler gagal dengan "function does not exist".
-- Pola disalin dari claim_delivery_invalidation_tasks: kandidat pending/processing
-- yang jatuh tempo + klaim kedaluwarsa, FOR UPDATE SKIP LOCKED, batas 1..100,
-- tandai processing + token klaim, kembalikan baris penuh.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.claim_delivery_activation_attempts(p_now timestamp with time zone, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamp with time zone)
 RETURNS SETOF domain_activation_attempts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id FROM public.domain_activation_attempts
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.domain_activation_attempts attempt
  SET status = 'processing',
      reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at,
      updated_at = p_now
  FROM candidates
  WHERE attempt.organization_id = candidates.organization_id AND attempt.id = candidates.id
  RETURNING attempt.*;
END;
$function$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (78, 'delivery_activation_claim', 'sha256:8224ca1fcd311f4022a8469de4b3c3ac8b0b35ef4474f0b7692eb40b2dee61a4');
