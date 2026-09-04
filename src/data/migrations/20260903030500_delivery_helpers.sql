-- Delivery helper reconciliation: provide the two helpers the delivery
-- repository calls that were never recorded in a migration, and widen the
-- member display lookup with the stored avatar.
--
-- 1. is_delivery_pending_host(hostname, attempt_id): whether a domain
--    activation attempt is still in flight. Mirrors the in-memory delivery
--    fixture contract (activate operation, pending/processing status, early
--    activation states). SECURITY DEFINER so the pending-domain route can call
--    it before any tenant is resolved; STABLE, read-only.
-- 2. lookup_user_profile(user_id): display_name plus avatar_url under the
--    same caller guards as the retired lookup_user_display_name (verified
--    caller with an active membership in the current organization). Replaces
--    it; the two repository call sites move over in application code.

CREATE OR REPLACE FUNCTION indicate_private.is_delivery_pending_host(p_hostname text, p_attempt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.domain_activation_attempts AS attempt
    WHERE attempt.id = p_attempt_id
      AND attempt.hostname = p_hostname
      AND attempt.operation = 'activate'
      AND attempt.status IN ('pending', 'processing')
      AND attempt.activation_state IN ('pending', 'cloudflare_verified', 'vercel_associated')
  )
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.is_delivery_pending_host(text, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.is_delivery_pending_host(text, uuid) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.lookup_user_profile(requested_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT target_user.display_name, target_user.avatar_url
  FROM public.users AS target_user
  WHERE target_user.id = requested_user_id
    AND indicate_private.current_verified_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.memberships AS caller_membership
      WHERE caller_membership.organization_id = indicate_private.current_organization_id()
        AND caller_membership.user_id = indicate_private.current_verified_user_id()
        AND caller_membership.status = 'active'
    )
  LIMIT 1
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.lookup_user_profile(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.lookup_user_profile(uuid) TO indicate_runtime;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.lookup_user_display_name(uuid);

CREATE OR REPLACE FUNCTION indicate_private.claim_delivery_invalidation_tasks(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.invalidation_tasks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.invalidation_tasks
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.invalidation_tasks task
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.*;
END;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_delivery_invalidation_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_delivery_invalidation_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (39, 'delivery_helpers', 'delivery-helpers-v1');
