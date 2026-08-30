-- Stage 3 verified organization discovery and stable Article-Site outcome dates.
-- Existing rows use the best durable historical signal available: published_at for
-- published outcomes, otherwise updated_at, with created_at as the final fallback.
ALTER TABLE public.article_sites
  ADD COLUMN state_occurred_at timestamp with time zone;--> statement-breakpoint

UPDATE public.article_sites
SET state_occurred_at = CASE
  WHEN state = 'published' THEN COALESCE(published_at, updated_at, created_at)
  ELSE COALESCE(updated_at, created_at)
END
WHERE state_occurred_at IS NULL;--> statement-breakpoint

ALTER TABLE public.article_sites
  ALTER COLUMN state_occurred_at SET DEFAULT now(),
  ALTER COLUMN state_occurred_at SET NOT NULL;--> statement-breakpoint

CREATE INDEX article_sites_outcome_date_idx
  ON public.article_sites (organization_id, site_id, state, state_occurred_at);--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.preserve_article_site_state_occurred_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NEW.state_occurred_at IS NOT DISTINCT FROM OLD.state_occurred_at THEN
      NEW.state_occurred_at := statement_timestamp();
    END IF;
  ELSE
    NEW.state_occurred_at := OLD.state_occurred_at;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER article_sites_state_occurred_at_guard
BEFORE UPDATE OF state, state_occurred_at ON public.article_sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.preserve_article_site_state_occurred_at();--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.list_active_organizations_for_verified_user()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT organization.id, organization.name
  FROM public.users AS caller
  INNER JOIN public.memberships AS membership
    ON membership.user_id = caller.id
   AND membership.status = 'active'
  INNER JOIN public.organizations AS organization
    ON organization.id = membership.organization_id
   AND organization.status = 'active'
  INNER JOIN public.roles AS role
    ON role.organization_id = membership.organization_id
   AND role.id = membership.role_id
   AND role.active = true
  WHERE caller.id = indicate_private.current_verified_user_id()
    AND caller.status = 'active'
  ORDER BY organization.name, organization.id
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION indicate_private.list_active_organizations_for_verified_user() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_active_organizations_for_verified_user() TO indicate_runtime;--> statement-breakpoint

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (6, 'stage3_discovery_outcome_timestamp', 'drizzle-0005')
ON CONFLICT (version) DO NOTHING;
