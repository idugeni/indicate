-- Declare and enforce each Domain's portal topology.
--
-- After the hierarchy migration every non-apex portal has a complete
-- apex -> region -> city chain, but nothing recorded whether a Domain is
-- supposed to have regional editions at all. Ninety-four apex brands are
-- national networks with no province, and ten are regional networks with a
-- full thirty-one city roster; the difference was implicit, so "every apex has
-- a region" was unenforceable and unverifiable. `domains.site_topology` makes
-- the difference explicit and machine-checked:
--
--   * `national`  - one apex portal only. The database refuses any region or
--                   city site in the domain, so a national network cannot
--                   silently grow a half-wired regional edition.
--   * `regional`  - the domain must keep at least one region portal and at
--                   least one city portal under it. Deleting the last city of
--                   a region, or activating a regional Domain with nothing
--                   under it, is rejected.
--
-- Both directions are checked by deferred constraint triggers, so a dashboard
-- transaction may create the Domain, its region portal, and its first city in
-- any order and still be validated at commit.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TYPE public.domain_site_topology AS ENUM ('national', 'regional');--> statement-breakpoint
ALTER TABLE public.domains ADD COLUMN site_topology public.domain_site_topology;--> statement-breakpoint
UPDATE public.domains AS d
   SET site_topology = (
     SELECT CASE WHEN count(*) > 0 THEN 'regional'::public.domain_site_topology ELSE 'national'::public.domain_site_topology END
       FROM public.sites AS s
      WHERE s.organization_id = d.organization_id AND s.domain_id = d.id AND s.site_level <> 'apex'
   );--> statement-breakpoint
ALTER TABLE public.domains ALTER COLUMN site_topology SET DEFAULT 'national';--> statement-breakpoint
ALTER TABLE public.domains ALTER COLUMN site_topology SET NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.assert_domain_topology(p_organization_id uuid, p_domain_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  topology public.domain_site_topology;
  region_portals integer;
  city_portals integer;
BEGIN
  SELECT site_topology INTO topology
    FROM public.domains
   WHERE organization_id = p_organization_id AND id = p_domain_id;
  IF topology IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO region_portals
    FROM public.sites
   WHERE organization_id = p_organization_id AND domain_id = p_domain_id AND site_level = 'regional';

  IF topology = 'national' THEN
    IF region_portals > 0 THEN
      RAISE EXCEPTION 'national domain cannot carry region or city portals' USING ERRCODE = '23514';
    END IF;
    RETURN;
  END IF;

  SELECT count(*) INTO city_portals
    FROM public.sites AS city
    JOIN public.sites AS region_portal ON region_portal.id = city.parent_site_id
   WHERE city.organization_id = p_organization_id
     AND region_portal.domain_id = p_domain_id
     AND city.site_level = 'city';

  IF region_portals = 0 OR city_portals = 0 THEN
    RAISE EXCEPTION 'regional domain needs a region portal and a city portal (region %, city %)', region_portals, city_portals
      USING ERRCODE = '23514';
  END IF;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.guard_domain_topology()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  PERFORM indicate_private.assert_domain_topology(NEW.organization_id, NEW.id);
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.guard_site_domain_topology()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  topology public.domain_site_topology;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    SELECT site_topology INTO topology
      FROM public.domains
     WHERE organization_id = NEW.organization_id AND id = NEW.domain_id;
    IF NEW.site_level <> 'apex' AND topology IS DISTINCT FROM 'regional'::public.domain_site_topology THEN
      RAISE EXCEPTION 'a % portal requires a regional domain', NEW.site_level USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.domain_id IS DISTINCT FROM NEW.domain_id) THEN
    PERFORM indicate_private.assert_domain_topology(OLD.organization_id, OLD.domain_id);
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER domains_topology_guard
  AFTER INSERT OR UPDATE ON public.domains
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_domain_topology();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER sites_domain_topology_guard
  AFTER INSERT OR UPDATE OR DELETE ON public.sites
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_site_domain_topology();--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (178, 'domain_site_topology', 'sha256:7c3ba233538d25b4ecdbf727575fb6ba1ce50cff0ac5a5870207b8ab8baf5a13');
