-- Phase 5 production-boundary hardening: RLS-safe discovery, durable recovery, and fenced invalidation.
ALTER TABLE public.domain_activation_attempts
  ADD COLUMN previous_hostname text,
  ADD COLUMN operation text NOT NULL DEFAULT 'activate',
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz,
  ADD COLUMN sanitized_failure jsonb,
  ADD CONSTRAINT domain_activation_attempts_operation_check CHECK (operation IN ('activate', 'deactivate'));--> statement-breakpoint
CREATE INDEX domain_activation_attempts_claim_idx
  ON public.domain_activation_attempts (status, next_attempt_at, reconciliation_claim_expires_at);--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.resolve_public_host(p_hostname text)
RETURNS TABLE (
  normalized_hostname text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  region_id uuid,
  routing_version integer,
  content_version integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id,
         s.region_id, s.routing_version, s.content_version
  FROM public.sites s
  JOIN public.domains d
    ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r
    ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE s.normalized_hostname = p_hostname
    AND s.status = 'active'
    AND s.activation_state = 'active'
    AND d.status = 'active'
    AND (s.region_id IS NULL OR r.status = 'active')
  ORDER BY s.organization_id, s.id
  LIMIT 2
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_public_host(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_public_host(text) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.is_pending_host(p_hostname text, p_attempt_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.domain_activation_attempts a
    JOIN public.sites s
      ON s.organization_id = a.organization_id AND s.id = a.site_id
    WHERE a.id = p_attempt_id
      AND a.hostname = p_hostname
      AND a.operation = 'activate'
      AND a.status IN ('pending', 'processing')
      AND a.activation_state IN ('pending', 'cloudflare_verified', 'vercel_associated')
      AND s.normalized_hostname = p_hostname
      AND s.status = 'inactive'
      AND s.activation_state = 'pending'
  )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.is_pending_host(text, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.is_pending_host(text, uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.is_previous_host_owned(
  p_organization_id uuid,
  p_site_id uuid,
  p_hostname text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.domain_activation_attempts a
    WHERE a.organization_id = p_organization_id
      AND a.site_id = p_site_id
      AND a.hostname = p_hostname
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.sites s
    WHERE s.normalized_hostname = p_hostname
      AND (s.organization_id, s.id) <> (p_organization_id, p_site_id)
  )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.is_previous_host_owned(uuid, uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.is_previous_host_owned(uuid, uuid, text) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.claim_activation_attempts(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.domain_activation_attempts
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.domain_activation_attempts
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.domain_activation_attempts attempt
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE attempt.organization_id = candidates.organization_id AND attempt.id = candidates.id
  RETURNING attempt.*;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_activation_attempts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_activation_attempts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.enable_cache_bypass_on_enqueue()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  INSERT INTO public.cache_bypasses(
    organization_id, site_id, bypass, version, reason, created_at, updated_at
  ) VALUES (
    NEW.organization_id, NEW.site_id, true, 1, 'invalidation_pending', NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true,
        version = public.cache_bypasses.version + 1,
        reason = 'invalidation_pending',
        updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.enable_cache_bypass_on_enqueue() FROM PUBLIC;--> statement-breakpoint
CREATE TRIGGER invalidation_tasks_enable_cache_bypass
AFTER INSERT ON public.invalidation_tasks
FOR EACH ROW EXECUTE FUNCTION indicate_private.enable_cache_bypass_on_enqueue();--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.complete_invalidation(
  p_organization_id uuid,
  p_task_id uuid,
  p_claim_token uuid,
  p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = 'completed', reconciliation_claim_token = NULL,
      reconciliation_claim_expires_at = NULL, sanitized_failure = NULL, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  PERFORM 1
  FROM public.cache_bypasses
  WHERE organization_id = p_organization_id AND site_id = v_site_id
  FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1
    FROM public.invalidation_tasks
    WHERE organization_id = p_organization_id AND site_id = v_site_id
      AND status <> 'completed'
  ) THEN
    INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
    VALUES (p_organization_id, v_site_id, false, 1, 'invalidation_completed', p_now, p_now)
    ON CONFLICT (organization_id, site_id) DO UPDATE
      SET bypass = false, version = public.cache_bypasses.version + 1,
          reason = 'invalidation_completed', updated_at = p_now;
  END IF;
  RETURN true;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.complete_invalidation(uuid, uuid, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.complete_invalidation(uuid, uuid, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.fail_invalidation(
  p_organization_id uuid,
  p_task_id uuid,
  p_claim_token uuid,
  p_failure jsonb,
  p_next_attempt_at timestamptz,
  p_terminal boolean,
  p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = CASE WHEN p_terminal THEN 'failed'::public.task_status ELSE 'pending'::public.task_status END,
      attempts = attempts + 1, next_attempt_at = p_next_attempt_at,
      reconciliation_claim_token = NULL, reconciliation_claim_expires_at = NULL,
      sanitized_failure = p_failure, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
  VALUES (p_organization_id, v_site_id, true, 1, 'invalidation_failed', p_now, p_now)
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true, version = public.cache_bypasses.version + 1,
        reason = 'invalidation_failed', updated_at = p_now;
  RETURN true;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.fail_invalidation(uuid, uuid, uuid, jsonb, timestamptz, boolean, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.fail_invalidation(uuid, uuid, uuid, jsonb, timestamptz, boolean, timestamptz) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (9, 'production_boundaries', 'production-boundaries-v1');
