-- Make the apex -> region -> city portal hierarchy explicit and enforced.
--
-- The original model stored only `sites.region_id`, so a hierarchy was
-- inferred: NULL meant apex, a `regions.kind='region'` row meant "regional",
-- and a `regions.kind='city'` row was expected to expand to a region that no
-- site row had to exist for. Ten live city sites therefore pointed at a
-- parent geography with no region site, and publication silently dropped the
-- region copy. This migration encodes the tree instead of inferring it:
--
--   * `sites.site_level` (apex|region|city) mirrors the geography kind and
--     makes "non-apex means city" impossible.
--   * `sites.parent_site_id` is the real edge: region hangs from the apex
--     site of the same domain, city hangs from the region site that serves
--     its parent geography.
--   * One apex site per domain, enforced by a partial unique index.
--   * Provisioning the region sites that the existing city sites require, so
--     the live ten Wonosobo editions gain a `jawa-tengah.<apex>` parent.
--
-- Hostname shape is untouched: apex equals the domain hostname, and both
-- derived levels stay a single label (`slug.<apex>`) so the wildcard
-- certificate, Cloudflare transport, and Vercel routing keep working. The
-- hierarchy is a data relation, not a DNS path.
--
-- Renaming a domain hostname or a geography slug previously left every
-- derived site hostname stale. Both renames now rewrite the affected sites
-- (bumping routing_version) inside the same transaction, and the existing
-- `sites_hostname_shape_guard` validates each rewritten row.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TYPE public.site_level AS ENUM ('apex', 'region', 'city');--> statement-breakpoint
ALTER TABLE public.sites ADD COLUMN site_level public.site_level;--> statement-breakpoint
ALTER TABLE public.sites ADD COLUMN parent_site_id uuid;--> statement-breakpoint
UPDATE public.sites AS s
   SET site_level = COALESCE(
         (SELECT CASE g.kind::text WHEN 'region' THEN 'region'::public.site_level ELSE 'city'::public.site_level END
            FROM public.regions AS g
           WHERE g.organization_id = s.organization_id AND g.id = s.region_id),
         'apex'::public.site_level);--> statement-breakpoint
WITH missing AS (
  SELECT DISTINCT ON (s.organization_id, s.domain_id, g.parent_region_id)
         s.organization_id,
         s.domain_id,
         g.parent_region_id,
         parent.slug AS region_slug,
         d.normalized_hostname AS apex_hostname,
         apex.id AS apex_site_id,
         apex.status AS apex_status,
         apex.activation_state AS apex_activation_state,
         (apex_settings.site_id IS NOT NULL) AS apex_settings_ready
    FROM public.sites AS s
    JOIN public.regions AS g
      ON g.organization_id = s.organization_id AND g.id = s.region_id AND g.kind = 'city'
    JOIN public.regions AS parent
      ON parent.organization_id = g.organization_id AND parent.id = g.parent_region_id AND parent.kind = 'region'
    JOIN public.domains AS d
      ON d.organization_id = s.organization_id AND d.id = s.domain_id
    JOIN public.sites AS apex
      ON apex.organization_id = s.organization_id AND apex.domain_id = s.domain_id AND apex.region_id IS NULL
    LEFT JOIN public.site_settings AS apex_settings
      ON apex_settings.organization_id = apex.organization_id AND apex_settings.site_id = apex.id
   WHERE NOT EXISTS (
     SELECT 1 FROM public.sites AS existing
      WHERE existing.organization_id = s.organization_id
        AND existing.domain_id = s.domain_id
        AND existing.region_id = g.parent_region_id
   )
   ORDER BY s.organization_id, s.domain_id, g.parent_region_id
), created AS (
  INSERT INTO public.sites (
    organization_id, id, domain_id, region_id, site_level, parent_site_id, normalized_hostname,
    status, activation_state, routing_version, content_version, version, created_at, updated_at
  )
  SELECT organization_id,
         gen_random_uuid(),
         domain_id,
         parent_region_id,
         'region'::public.site_level,
         apex_site_id,
         region_slug || '.' || apex_hostname,
         (CASE WHEN apex_status = 'active' AND apex_activation_state = 'active' AND apex_settings_ready THEN 'active' ELSE 'inactive' END)::public.record_status,
         (CASE WHEN apex_status = 'active' AND apex_activation_state = 'active' AND apex_settings_ready THEN 'active' ELSE 'inactive' END)::public.site_activation_state,
         1, 1, 1, now(), now()
    FROM missing
  RETURNING organization_id, id, parent_site_id, region_id, normalized_hostname
), provisioned AS (
  INSERT INTO public.site_settings (
    organization_id, site_id, name, description, colors, social_links, seo, navigation,
    logo_media_id, favicon_media_id, default_media_id, version, created_at, updated_at,
    locale, seo_default_title, seo_default_description, seo_robots_directive,
    seo_open_graph_site_name, seo_schema_version, tagline
  )
  SELECT apex_settings.organization_id,
         created.id,
         left(coalesce(apex_settings.name, '') || ' - ' || area.name, 160),
         left(coalesce(apex_settings.description, '') || ' - ' || area.name, 1000),
         apex_settings.colors,
         apex_settings.social_links,
         apex_settings.seo,
         apex_settings.navigation,
         NULL,
         NULL,
         apex_settings.default_media_id,
         1,
         now(),
         now(),
         apex_settings.locale,
         left(coalesce(apex_settings.seo_default_title, apex_settings.name, '') || ' | ' || area.name, 60),
         left(coalesce(apex_settings.seo_default_description, apex_settings.description, '') || ' ' || area.name, 160),
         apex_settings.seo_robots_directive,
         left(coalesce(apex_settings.seo_open_graph_site_name, apex_settings.name, '') || ' - ' || area.name, 160),
         apex_settings.seo_schema_version,
         apex_settings.tagline
    FROM created
    JOIN public.sites AS apex
      ON apex.organization_id = created.organization_id AND apex.id = created.parent_site_id
    JOIN public.site_settings AS apex_settings
      ON apex_settings.organization_id = apex.organization_id AND apex_settings.site_id = apex.id
    JOIN public.regions AS area
      ON area.organization_id = created.organization_id AND area.id = created.region_id
  RETURNING site_id
)
INSERT INTO public.audit_logs (
  organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id,
  outcome, changed_fields, after, request_id
)
SELECT created.organization_id,
       gen_random_uuid(),
       'system',
       'migration:site_hierarchy_levels',
       'worker',
       'site.hierarchy.provision_region',
       'site',
       created.id::text,
       'succeeded',
       ARRAY['siteLevel', 'parentSiteId', 'normalizedHostname'],
       jsonb_build_object(
         'hostname', created.normalized_hostname,
         'siteLevel', 'region',
         'parentSiteId', created.parent_site_id
       ),
       'migration:175'
  FROM created
 WHERE created.id IN (SELECT site_id FROM provisioned);--> statement-breakpoint
SET CONSTRAINTS ALL IMMEDIATE;--> statement-breakpoint
UPDATE public.sites AS s
   SET parent_site_id = (
     SELECT parent.id
       FROM public.regions AS g
       JOIN public.sites AS parent
         ON parent.organization_id = g.organization_id
        AND parent.domain_id = s.domain_id
        AND parent.region_id IS NOT DISTINCT FROM g.parent_region_id
      WHERE g.organization_id = s.organization_id
        AND g.id = s.region_id
   )
 WHERE s.parent_site_id IS NULL
   AND s.region_id IS NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sites WHERE site_level <> 'apex' AND (parent_site_id IS NULL OR region_id IS NULL)) THEN
    RAISE EXCEPTION 'site_hierarchy_backfill_incomplete: derived sites without a parent';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sites WHERE site_level = 'apex' AND (parent_site_id IS NOT NULL OR region_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'site_hierarchy_backfill_incomplete: apex sites carrying hierarchy links';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sites AS s
      JOIN public.regions AS g ON g.organization_id = s.organization_id AND g.id = s.region_id
     WHERE g.kind::text <> s.site_level::text
  ) THEN
    RAISE EXCEPTION 'site_hierarchy_backfill_incomplete: site level disagrees with geography kind';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sites AS s
      JOIN public.regions AS g ON g.organization_id = s.organization_id AND g.id = s.region_id
      JOIN public.sites AS parent
        ON parent.organization_id = s.organization_id
       AND parent.domain_id = s.domain_id
       AND parent.site_level = 'apex'
     WHERE s.site_level = 'region' AND parent.id IS DISTINCT FROM s.parent_site_id
  ) THEN
    RAISE EXCEPTION 'site_hierarchy_backfill_incomplete: region site not linked to its apex';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sites AS s
      JOIN public.regions AS g ON g.organization_id = s.organization_id AND g.id = s.region_id
      JOIN public.sites AS parent
        ON parent.organization_id = s.organization_id
       AND parent.domain_id = s.domain_id
       AND parent.region_id IS NOT DISTINCT FROM g.parent_region_id
     WHERE s.site_level = 'city' AND parent.id IS DISTINCT FROM s.parent_site_id
  ) THEN
    RAISE EXCEPTION 'site_hierarchy_backfill_incomplete: city site not linked to its region site';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE public.sites ALTER COLUMN site_level SET NOT NULL;--> statement-breakpoint
ALTER TABLE public.sites ADD CONSTRAINT sites_parent_fk
  FOREIGN KEY (organization_id, parent_site_id) REFERENCES public.sites (organization_id, id) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE public.sites ADD CONSTRAINT sites_hierarchy_shape CHECK (
  (site_level = 'apex' AND parent_site_id IS NULL AND region_id IS NULL)
  OR (site_level IN ('region', 'city') AND parent_site_id IS NOT NULL AND region_id IS NOT NULL)
);--> statement-breakpoint
CREATE UNIQUE INDEX sites_organization_domain_apex_unique
  ON public.sites (organization_id, domain_id) WHERE site_level = 'apex';--> statement-breakpoint
CREATE INDEX sites_parent_idx ON public.sites (organization_id, parent_site_id);--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.guard_site_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  geography_kind text;
  geography_parent uuid;
  parent_row public.sites%ROWTYPE;
BEGIN
  IF NEW.site_level = 'apex' THEN
    IF NEW.parent_site_id IS NOT NULL OR NEW.region_id IS NOT NULL THEN
      RAISE EXCEPTION 'apex site must not carry hierarchy links' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_site_id IS NULL OR NEW.region_id IS NULL THEN
    RAISE EXCEPTION '% site requires both a parent site and a geography', NEW.site_level USING ERRCODE = '23514';
  END IF;
  IF NEW.parent_site_id = NEW.id THEN
    RAISE EXCEPTION 'site cannot be its own parent' USING ERRCODE = '23514';
  END IF;

  SELECT g.kind::text, g.parent_region_id INTO geography_kind, geography_parent
    FROM public.regions AS g
   WHERE g.organization_id = NEW.organization_id AND g.id = NEW.region_id;
  IF geography_kind IS NULL THEN
    RAISE EXCEPTION 'site geography unavailable' USING ERRCODE = '23503';
  END IF;
  IF geography_kind <> NEW.site_level::text THEN
    RAISE EXCEPTION 'site level % does not match geography kind %', NEW.site_level, geography_kind USING ERRCODE = '23514';
  END IF;
  IF NEW.site_level = 'region' AND geography_parent IS NOT NULL THEN
    RAISE EXCEPTION 'region geography must be parentless' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO parent_row
    FROM public.sites AS p
   WHERE p.organization_id = NEW.organization_id AND p.id = NEW.parent_site_id;
  IF parent_row.id IS NULL THEN
    RAISE EXCEPTION 'parent site unavailable' USING ERRCODE = '23503';
  END IF;
  IF parent_row.domain_id <> NEW.domain_id THEN
    RAISE EXCEPTION 'parent site belongs to another domain' USING ERRCODE = '23514';
  END IF;
  IF NEW.site_level = 'region' AND parent_row.site_level <> 'apex' THEN
    RAISE EXCEPTION 'region site must hang from the apex site of its domain' USING ERRCODE = '23514';
  END IF;
  IF NEW.site_level = 'city' AND parent_row.site_level <> 'region' THEN
    RAISE EXCEPTION 'city site must hang from a region site' USING ERRCODE = '23514';
  END IF;
  IF NEW.site_level = 'city' AND parent_row.region_id IS DISTINCT FROM geography_parent THEN
    RAISE EXCEPTION 'city site parent must be the site of the city parent geography' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS sites_hierarchy_guard ON public.sites;--> statement-breakpoint
CREATE TRIGGER sites_hierarchy_guard
  BEFORE INSERT OR UPDATE OF organization_id, domain_id, region_id, site_level, parent_site_id
  ON public.sites FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_site_hierarchy();--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.guard_region_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  parent_kind text;
  referencing_sites integer;
BEGIN
  IF NEW.parent_region_id IS NULL THEN
    IF NEW.kind::text <> 'region' THEN
      RAISE EXCEPTION 'city geography requires a region parent' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.kind::text <> 'city' THEN
    RAISE EXCEPTION 'only a city geography may declare a parent' USING ERRCODE = '23514';
  END IF;
  IF NEW.parent_region_id = NEW.id THEN
    RAISE EXCEPTION 'geography cannot be its own parent' USING ERRCODE = '23514';
  END IF;

  SELECT g.kind::text INTO parent_kind
    FROM public.regions AS g
   WHERE g.organization_id = NEW.organization_id AND g.id = NEW.parent_region_id;
  IF parent_kind IS DISTINCT FROM 'region' THEN
    RAISE EXCEPTION 'city parent must be a region geography' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
     AND (NEW.kind IS DISTINCT FROM OLD.kind OR NEW.parent_region_id IS DISTINCT FROM OLD.parent_region_id) THEN
    SELECT count(*) INTO referencing_sites
      FROM public.sites AS s
     WHERE s.organization_id = NEW.organization_id AND s.region_id = NEW.id;
    IF referencing_sites > 0 THEN
      RAISE EXCEPTION 'geography kind and parent are immutable while % site(s) reference it', referencing_sites
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS regions_hierarchy_guard ON public.regions;--> statement-breakpoint
CREATE TRIGGER regions_hierarchy_guard
  BEFORE INSERT OR UPDATE OF organization_id, kind, parent_region_id
  ON public.regions FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_region_hierarchy();--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.cascade_domain_hostname()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.normalized_hostname IS NOT DISTINCT FROM OLD.normalized_hostname THEN
    RETURN NEW;
  END IF;

  UPDATE public.sites AS s
     SET normalized_hostname = COALESCE((
           SELECT g.slug || '.'
             FROM public.regions AS g
            WHERE g.organization_id = s.organization_id AND g.id = s.region_id
         ), '') || NEW.normalized_hostname,
         routing_version = s.routing_version + 1,
         version = s.version + 1,
         updated_at = now()
   WHERE s.organization_id = NEW.organization_id
     AND s.domain_id = NEW.id;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS domains_hostname_rename_cascade ON public.domains;--> statement-breakpoint
CREATE TRIGGER domains_hostname_rename_cascade
  AFTER UPDATE OF normalized_hostname ON public.domains
  FOR EACH ROW EXECUTE FUNCTION indicate_private.cascade_domain_hostname();--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.cascade_region_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.slug IS NOT DISTINCT FROM OLD.slug THEN
    RETURN NEW;
  END IF;

  UPDATE public.sites AS s
     SET normalized_hostname = NEW.slug || '.' || d.normalized_hostname,
         routing_version = s.routing_version + 1,
         version = s.version + 1,
         updated_at = now()
    FROM public.domains AS d
   WHERE d.organization_id = s.organization_id
     AND d.id = s.domain_id
     AND s.organization_id = NEW.organization_id
     AND s.region_id = NEW.id;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS regions_slug_rename_cascade ON public.regions;--> statement-breakpoint
CREATE TRIGGER regions_slug_rename_cascade
  AFTER UPDATE OF slug ON public.regions
  FOR EACH ROW EXECUTE FUNCTION indicate_private.cascade_region_slug();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.list_public_network_sites();--> statement-breakpoint
CREATE FUNCTION indicate_private.list_public_network_sites()
RETURNS TABLE (
  hostname text,
  parent_hostname text,
  site_level text,
  site_name text,
  description text,
  tagline text,
  area_name text,
  parent_area_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT s.normalized_hostname,
         parent.normalized_hostname,
         s.site_level::text,
         ss.name,
         ss.description,
         ss.tagline,
         area.name,
         parent_area.name
    FROM public.sites AS s
    JOIN public.site_settings AS ss
      ON ss.organization_id = s.organization_id AND ss.site_id = s.id
    LEFT JOIN public.sites AS parent
      ON parent.organization_id = s.organization_id AND parent.id = s.parent_site_id
    LEFT JOIN public.regions AS area
      ON area.organization_id = s.organization_id AND area.id = s.region_id
    LEFT JOIN public.regions AS parent_area
      ON parent_area.organization_id = s.organization_id AND parent_area.id = parent.region_id
   WHERE s.status = 'active'
     AND s.activation_state = 'active'
   ORDER BY s.normalized_hostname;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_public_network_sites() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_public_network_sites() TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (175, 'site_hierarchy_levels', 'sha256:01736ab29f7b22ce49affd8aa1bc6de7197306e2d7e2a4f059a028a44e85f170');
