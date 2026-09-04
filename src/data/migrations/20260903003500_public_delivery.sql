-- Phase 5 durable public routing, exact-domain activation, and recoverable cache invalidation.
ALTER TABLE public.invalidation_tasks
  ADD COLUMN paths text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz,
  ADD CONSTRAINT invalidation_tasks_attempts_nonnegative CHECK (attempts >= 0);--> statement-breakpoint
ALTER TABLE public.invalidation_tasks
  ADD CONSTRAINT invalidation_tasks_id_unique UNIQUE (id);--> statement-breakpoint
CREATE INDEX invalidation_tasks_claim_idx
  ON public.invalidation_tasks (status, reconciliation_claim_expires_at);--> statement-breakpoint

CREATE TABLE public.cache_bypasses (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  site_id uuid NOT NULL,
  bypass boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cache_bypasses_pk PRIMARY KEY (organization_id, site_id),
  CONSTRAINT cache_bypasses_site_fk FOREIGN KEY (organization_id, site_id) REFERENCES public.sites(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT cache_bypasses_version_positive CHECK (version > 0)
);--> statement-breakpoint
ALTER TABLE public.cache_bypasses ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.cache_bypasses FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.cache_bypasses
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.cache_bypasses TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.claim_invalidation_tasks(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.invalidation_tasks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_invalidation_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_invalidation_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.site_hostname_guard()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE parent_host text; region_slug text;
BEGIN
  SELECT normalized_hostname INTO parent_host FROM public.domains
   WHERE organization_id = NEW.organization_id AND id = NEW.domain_id;
  IF parent_host IS NULL THEN RAISE EXCEPTION 'RESOURCE_UNAVAILABLE'; END IF;
  IF NEW.region_id IS NULL THEN
    IF NEW.normalized_hostname <> parent_host THEN RAISE EXCEPTION 'INVALID_SITE_HOSTNAME'; END IF;
  ELSE
    SELECT slug INTO region_slug FROM public.regions
     WHERE organization_id = NEW.organization_id AND id = NEW.region_id;
    IF region_slug IS NULL OR NEW.normalized_hostname <> region_slug || '.' || parent_host THEN RAISE EXCEPTION 'INVALID_SITE_HOSTNAME'; END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER site_hostname_guard
BEFORE INSERT OR UPDATE OF organization_id, domain_id, region_id, normalized_hostname ON public.sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.site_hostname_guard();--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (8, 'public_delivery', 'public-delivery-v1');
