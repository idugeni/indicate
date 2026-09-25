-- Correct the site-level enum literal in the topology assertions.
--
-- `assert_domain_topology` compared `site_level` against `'regional'`, which is
-- a `domain_site_topology` value, not a `site_level` value. The function body
-- is only parsed when the deferred trigger fires, so the bad literal surfaced
-- on the first domain or site write after the migration instead of at apply
-- time. Both comparisons now use `'region'`.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
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
   WHERE organization_id = p_organization_id AND domain_id = p_domain_id AND site_level = 'region';

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
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (179, 'domain_topology_site_level_literal', 'sha256:b96e7f080dec93588ec306d3d9b09a9da4c0eb9de44fa9ae868392062cd8f078');
