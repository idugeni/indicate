-- Extend the Jawa Tengah network to every Domain.
--
-- The 94 national Domains were provisionally national because no province was
-- assigned to them. The owner decision is that all Domains carry Jawa Tengah
-- for now, so every Domain becomes `regional`: one `jawa-tengah.{apex}` region
-- portal plus the full 31-city roster from docs/tenants/upt-jateng.md, for a
-- total of 104 region and 3224 city portals.
--
-- Ordering matters inside the transaction. The topology flip is written first
-- so the deferred `sites_domain_topology_guard` sees a regional Domain when it
-- checks the new rows at commit, then the region portal, then its cities. All
-- three guard sets (`sites_hierarchy_guard`, `sites_hierarchy_shape`,
-- `domains_topology_guard`) validate the finished tree when the transaction
-- commits, so a partial rollout cannot be left behind.
--
-- Portals that already exist are skipped, which makes the migration idempotent
-- and keeps the bespoke per-brand city copy authored for the first ten Domains
-- untouched. Domains without a hand-authored city voice derive theirs from the
-- apex brand, prefixed by the city so no title collides with the apex:
-- `Semarang - Fakta01 - Fakta Berlapis, Kebenaran Teruji.` Brand assets stay
-- inherited (logo and favicon NULL, `default_media_id` from the apex) exactly
-- like the ten portals that were live before this migration.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
UPDATE public.domains
   SET site_topology = 'regional'
 WHERE site_topology = 'national';--> statement-breakpoint
WITH target AS (
  SELECT domain.organization_id,
         domain.id AS domain_id,
         domain.normalized_hostname AS apex_hostname,
         apex.id AS apex_site_id,
         apex.status AS apex_status,
         apex.activation_state AS apex_activation_state,
         (apex_settings.site_id IS NOT NULL) AS apex_settings_ready
    FROM public.domains AS domain
    JOIN public.sites AS apex
      ON apex.organization_id = domain.organization_id
     AND apex.domain_id = domain.id
     AND apex.site_level = 'apex'
    LEFT JOIN public.site_settings AS apex_settings
      ON apex_settings.organization_id = apex.organization_id AND apex_settings.site_id = apex.id
   WHERE NOT EXISTS (
     SELECT 1 FROM public.sites AS region_portal
      WHERE region_portal.organization_id = domain.organization_id
        AND region_portal.domain_id = domain.id
        AND region_portal.site_level = 'region'
   )
), created AS (
  INSERT INTO public.sites (
    organization_id, id, domain_id, region_id, site_level, parent_site_id, normalized_hostname,
    status, activation_state, routing_version, content_version, version, created_at, updated_at
  )
  SELECT target.organization_id,
         gen_random_uuid(),
         target.domain_id,
         province.id,
         'region'::public.site_level,
         target.apex_site_id,
         province.slug || '.' || target.apex_hostname,
         (CASE WHEN target.apex_status = 'active' AND target.apex_activation_state = 'active' AND target.apex_settings_ready THEN 'active' ELSE 'inactive' END)::public.record_status,
         (CASE WHEN target.apex_status = 'active' AND target.apex_activation_state = 'active' AND target.apex_settings_ready THEN 'active' ELSE 'inactive' END)::public.site_activation_state,
         1, 1, 1, now(), now()
    FROM target
    JOIN public.regions AS province
      ON province.slug = 'jawa-tengah' AND province.kind = 'region'
  RETURNING organization_id, id, domain_id, region_id, parent_site_id, normalized_hostname
), provisioned AS (
  INSERT INTO public.site_settings (
    organization_id, site_id, name, description, colors, social_links, seo, navigation,
    logo_media_id, favicon_media_id, default_media_id, version, created_at, updated_at,
    locale, seo_default_title, seo_default_description, seo_robots_directive,
    seo_open_graph_site_name, seo_schema_version, tagline
  )
  SELECT apex_settings.organization_id,
         created.id,
         left(coalesce(apex_settings.name, '') || ' - ' || province.name, 160),
         left(coalesce(apex_settings.description, '') || ' - ' || province.name, 1000),
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
         left(province.name || ' - ' || coalesce(apex_settings.seo_default_title, apex_settings.name, ''), 60),
         left(province.name || '. ' || coalesce(apex_settings.seo_default_description, apex_settings.description, ''), 160),
         apex_settings.seo_robots_directive,
         left(province.name || ' - ' || coalesce(apex_settings.seo_open_graph_site_name, apex_settings.name, ''), 160),
         apex_settings.seo_schema_version,
         apex_settings.tagline
    FROM created
    JOIN public.sites AS apex
      ON apex.organization_id = created.organization_id AND apex.id = created.parent_site_id
    JOIN public.site_settings AS apex_settings
      ON apex_settings.organization_id = apex.organization_id AND apex_settings.site_id = apex.id
    JOIN public.regions AS province
      ON province.organization_id = created.organization_id AND province.id = created.region_id
  RETURNING site_id
)
INSERT INTO public.audit_logs (
  organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id,
  outcome, changed_fields, after, request_id
)
SELECT created.organization_id,
       gen_random_uuid(),
       'system',
       'migration:jateng_network_all_domains',
       'worker',
       'site.hierarchy.provision_region',
       'site',
       created.id::text,
       'succeeded',
       ARRAY['siteLevel', 'parentSiteId', 'regionId', 'normalizedHostname'],
       jsonb_build_object('hostname', created.normalized_hostname, 'siteLevel', 'region', 'parentSiteId', created.parent_site_id),
       'migration:180'
  FROM created
 WHERE created.id IN (SELECT site_id FROM provisioned);--> statement-breakpoint
WITH brand AS (
  SELECT domain.organization_id,
         domain.id AS domain_id,
         domain.normalized_hostname AS apex_hostname,
         region_portal.id AS region_site_id,
         apex_settings.name AS apex_name,
         apex_settings.description AS apex_description,
         apex_settings.seo_default_title AS apex_seo_title,
         apex_settings.seo_default_description AS apex_seo_description,
         apex_settings.seo_open_graph_site_name AS apex_open_graph_name,
         apex_settings.colors,
         apex_settings.social_links,
         apex_settings.seo,
         apex_settings.navigation,
         apex_settings.locale,
         apex_settings.seo_robots_directive,
         apex_settings.seo_schema_version,
         apex_settings.default_media_id
    FROM public.domains AS domain
    JOIN public.sites AS region_portal
      ON region_portal.organization_id = domain.organization_id
     AND region_portal.domain_id = domain.id
     AND region_portal.site_level = 'region'
    JOIN public.sites AS apex
      ON apex.organization_id = domain.organization_id
     AND apex.domain_id = domain.id
     AND apex.site_level = 'apex'
    JOIN public.site_settings AS apex_settings
      ON apex_settings.organization_id = apex.organization_id AND apex_settings.site_id = apex.id
), geography AS (
  SELECT id, name, slug
    FROM public.regions
   WHERE kind = 'city' AND status = 'active'
), created AS (
  INSERT INTO public.sites (
    organization_id, id, domain_id, region_id, site_level, parent_site_id, normalized_hostname,
    status, activation_state, routing_version, content_version, version, created_at, updated_at
  )
  SELECT brand.organization_id,
         gen_random_uuid(),
         brand.domain_id,
         geography.id,
         'city'::public.site_level,
         brand.region_site_id,
         geography.slug || '.' || brand.apex_hostname,
         'active'::public.record_status,
         'active'::public.site_activation_state,
         1, 1, 1, now(), now()
    FROM brand
    CROSS JOIN geography
   WHERE NOT EXISTS (
     SELECT 1 FROM public.sites AS existing
      WHERE existing.organization_id = brand.organization_id
        AND existing.normalized_hostname = geography.slug || '.' || brand.apex_hostname
   )
  RETURNING organization_id, id, domain_id, region_id, parent_site_id, normalized_hostname
), provisioned AS (
  INSERT INTO public.site_settings (
    organization_id, site_id, name, description, colors, social_links, seo, navigation,
    logo_media_id, favicon_media_id, default_media_id, version, created_at, updated_at,
    locale, seo_default_title, seo_default_description, seo_robots_directive,
    seo_open_graph_site_name, seo_schema_version, tagline
  )
  SELECT created.organization_id,
         created.id,
         left(coalesce(brand.apex_name, '') || ' ' || geography.name, 160),
         left(coalesce(brand.apex_description, '') || ' Edisi ' || geography.name || '.', 1000),
         brand.colors,
         brand.social_links,
         brand.seo,
         brand.navigation,
         NULL,
         NULL,
         brand.default_media_id,
         1,
         now(),
         now(),
         brand.locale,
         left(geography.name || ' - ' || coalesce(brand.apex_seo_title, brand.apex_name, ''), 60),
         left(coalesce(brand.apex_seo_description, brand.apex_description, '') || ' Edisi ' || geography.name || '.', 160),
         brand.seo_robots_directive,
         left(coalesce(brand.apex_open_graph_name, brand.apex_name, '') || ' ' || geography.name, 160),
         brand.seo_schema_version,
         left('Kabar ' || geography.name || ' Terverifikasi.', 120)
    FROM created
    JOIN brand
      ON brand.organization_id = created.organization_id AND brand.domain_id = created.domain_id
    JOIN geography
      ON geography.id = created.region_id
  RETURNING site_id
)
INSERT INTO public.audit_logs (
  organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id,
  outcome, changed_fields, after, request_id
)
SELECT created.organization_id,
       gen_random_uuid(),
       'system',
       'migration:jateng_network_all_domains',
       'worker',
       'site.hierarchy.provision_city',
       'site',
       created.id::text,
       'succeeded',
       ARRAY['siteLevel', 'parentSiteId', 'regionId', 'normalizedHostname'],
       jsonb_build_object('hostname', created.normalized_hostname, 'siteLevel', 'city', 'parentSiteId', created.parent_site_id),
       'migration:180'
  FROM created
 WHERE created.id IN (SELECT site_id FROM provisioned);--> statement-breakpoint
DO $$
DECLARE
  domains_total integer;
  domains_regional integer;
  region_portals integer;
  expected_cities integer;
  actual_cities integer;
BEGIN
  SELECT count(*) INTO domains_total FROM public.domains;
  SELECT count(*) INTO domains_regional FROM public.domains WHERE site_topology = 'regional';
  SELECT count(*) INTO region_portals FROM public.sites WHERE site_level = 'region';
  SELECT count(*) INTO expected_cities
    FROM public.domains AS domain
    CROSS JOIN public.regions AS geography
   WHERE geography.kind = 'city' AND geography.status = 'active';
  SELECT count(*) INTO actual_cities FROM public.sites WHERE site_level = 'city';

  IF domains_regional <> domains_total THEN
    RAISE EXCEPTION 'jateng_network_incomplete: % of % domains are regional', domains_regional, domains_total;
  END IF;
  IF region_portals <> domains_total THEN
    RAISE EXCEPTION 'jateng_network_incomplete: % region portals for % domains', region_portals, domains_total;
  END IF;
  IF actual_cities <> expected_cities THEN
    RAISE EXCEPTION 'jateng_network_incomplete: % city portals, expected %', actual_cities, expected_cities;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sites AS city
      JOIN public.sites AS region_portal ON region_portal.id = city.parent_site_id
      JOIN public.sites AS apex ON apex.id = region_portal.parent_site_id
     WHERE city.site_level = 'city' AND (region_portal.site_level <> 'region' OR apex.site_level <> 'apex')
  ) THEN
    RAISE EXCEPTION 'jateng_network_incomplete: a city portal is not on a full apex -> region -> city chain';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sites
     WHERE site_level <> 'apex' AND status = 'active' AND activation_state = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM public.site_settings AS settings
          WHERE settings.organization_id = sites.organization_id AND settings.site_id = sites.id
            AND settings.default_media_id IS NOT NULL AND settings.seo_default_title IS NOT NULL
            AND settings.seo_default_description IS NOT NULL AND settings.seo_open_graph_site_name IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'jateng_network_incomplete: an active derived portal lacks complete settings';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (180, 'jateng_network_all_domains', 'sha256:a2cd1d27e16b824d5552cc8532064b35ac92d7ae73571ea9aac8417e6f340edf');
