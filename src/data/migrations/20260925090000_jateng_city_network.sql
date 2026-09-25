-- Roll out the documented Jawa Tengah city network (docs/tenants/upt-jateng.md).
--
-- The plan on file lists 31 kabupaten/kota for Jawa Tengah, propagated to the
-- portal-media domains that already run the prisoner-affiliation network
-- (the ten apexes carrying `wonosobo.*`). Only Wonosobo was ever created, so
-- ten of the 310 documented portals existed and 300 were missing. This
-- migration closes that gap:
--
--   * 30 `regions` rows (kind='city', parent = Jawa Tengah), slugs taken
--     verbatim from the plan table so hostnames match the documented contract.
--   * 300 `sites` rows (10 domains x 31 cities, minus the 10 live Wonosobo
--     sites), each parented to its domain's region site, so every non-apex
--     portal carries a complete apex -> region -> city chain.
--
-- Per-portal copy is derived from each brand's existing Wonosobo portal by
-- substituting the city name, so every brand keeps its own editorial voice and
-- no two (brand, city) pairs share a title, description, or tagline. Brand
-- assets stay inherited: logo and favicon are NULL (null-inheritance contract,
-- resolved to the apex at delivery) and `default_media_id` points at the
-- brand's active apex media until a dedicated city asset is uploaded through
-- the dashboard. Navigation, colors, locale, robots, and schema version clone
-- from the apex settings, matching the live Wonosobo portals.
--
-- Hostnames stay one label (`{city}.{apex}`) so the existing wildcard
-- certificate serves them without any DNS or Vercel association, exactly like
-- the ten portals already live.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.regions (
  organization_id, id, external_key, name, slug, status, kind, parent_region_id, version, created_at, updated_at
)
SELECT parent.organization_id,
       gen_random_uuid(),
       city.slug,
       city.name,
       city.slug,
       'active'::public.record_status,
       'city'::public.region_kind,
       parent.id,
       1,
       now(),
       now()
  FROM (
    VALUES
      ('banjarnegara', 'Banjarnegara'),
      ('banyumas', 'Banyumas'),
      ('batang', 'Batang'),
      ('blora', 'Blora'),
      ('boyolali', 'Boyolali'),
      ('brebes', 'Brebes'),
      ('cilacap', 'Cilacap'),
      ('demak', 'Demak'),
      ('grobogan', 'Grobogan'),
      ('jepara', 'Jepara'),
      ('karanganyar', 'Karanganyar'),
      ('kebumen', 'Kebumen'),
      ('kendal', 'Kendal'),
      ('klaten', 'Klaten'),
      ('kudus', 'Kudus'),
      ('magelang', 'Magelang'),
      ('pati', 'Pati'),
      ('pekalongan', 'Pekalongan'),
      ('pemalang', 'Pemalang'),
      ('purbalingga', 'Purbalingga'),
      ('purworejo', 'Purworejo'),
      ('rembang', 'Rembang'),
      ('salatiga', 'Salatiga'),
      ('semarang', 'Semarang'),
      ('sragen', 'Sragen'),
      ('sukoharjo', 'Sukoharjo'),
      ('surakarta', 'Surakarta'),
      ('tegal', 'Tegal'),
      ('temanggung', 'Temanggung'),
      ('wonogiri', 'Wonogiri')
  ) AS city(slug, name)
  JOIN public.regions AS parent
    ON parent.slug = 'jawa-tengah' AND parent.kind = 'region'
ON CONFLICT (organization_id, external_key) DO NOTHING;--> statement-breakpoint
WITH brand AS (
  SELECT city.organization_id,
         city.domain_id,
         domain.normalized_hostname AS apex_hostname,
         region_site.id AS region_site_id,
         apex_settings.name AS apex_name,
         apex_settings.colors,
         apex_settings.social_links,
         apex_settings.seo,
         apex_settings.navigation,
         apex_settings.locale,
         apex_settings.seo_robots_directive,
         apex_settings.seo_schema_version,
         apex_settings.default_media_id,
         city_settings.name AS city_name_frame,
         city_settings.description AS city_description_frame,
         city_settings.seo_default_title AS city_title_frame,
         city_settings.seo_default_description AS city_seo_description_frame,
         city_settings.seo_open_graph_site_name AS city_og_frame,
         city_settings.tagline AS city_tagline_frame
    FROM public.sites AS city
    JOIN public.site_settings AS city_settings
      ON city_settings.organization_id = city.organization_id AND city_settings.site_id = city.id
    JOIN public.sites AS region_site
      ON region_site.organization_id = city.organization_id
     AND region_site.domain_id = city.domain_id
     AND region_site.site_level = 'region'
    JOIN public.sites AS apex
      ON apex.organization_id = city.organization_id
     AND apex.domain_id = city.domain_id
     AND apex.site_level = 'apex'
    JOIN public.site_settings AS apex_settings
      ON apex_settings.organization_id = apex.organization_id AND apex_settings.site_id = apex.id
    JOIN public.domains AS domain
      ON domain.organization_id = city.organization_id AND domain.id = city.domain_id
   WHERE city.site_level = 'city'
     AND city.normalized_hostname LIKE 'wonosobo.%'
), geography AS (
  SELECT organization_id, id, name, slug
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
         replace(brand.city_name_frame, 'Wonosobo', geography.name),
         replace(brand.city_description_frame, 'Wonosobo', geography.name),
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
         left(replace(brand.city_title_frame, 'Wonosobo', geography.name), 60),
         left(replace(brand.city_seo_description_frame, 'Wonosobo', geography.name), 160),
         brand.seo_robots_directive,
         left(replace(brand.city_og_frame, 'Wonosobo', geography.name), 160),
         brand.seo_schema_version,
         replace(brand.city_tagline_frame, 'Wonosobo', geography.name)
    FROM created
    JOIN brand
      ON brand.organization_id = created.organization_id AND brand.domain_id = created.domain_id
    JOIN geography
      ON geography.organization_id = created.organization_id AND geography.id = created.region_id
  RETURNING site_id
)
INSERT INTO public.audit_logs (
  organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id,
  outcome, changed_fields, after, request_id
)
SELECT created.organization_id,
       gen_random_uuid(),
       'system',
       'migration:jateng_city_network',
       'worker',
       'site.hierarchy.provision_city',
       'site',
       created.id::text,
       'succeeded',
       ARRAY['siteLevel', 'parentSiteId', 'regionId', 'normalizedHostname'],
       jsonb_build_object(
         'hostname', created.normalized_hostname,
         'siteLevel', 'city',
         'parentSiteId', created.parent_site_id,
         'regionId', created.region_id
       ),
       'migration:177'
  FROM created
 WHERE created.id IN (SELECT site_id FROM provisioned);--> statement-breakpoint
DO $$
DECLARE
  expected integer;
  actual integer;
BEGIN
  SELECT count(*) INTO expected
    FROM public.sites AS city
    JOIN public.sites AS region_site
      ON region_site.organization_id = city.organization_id
     AND region_site.domain_id = city.domain_id
     AND region_site.site_level = 'region'
   WHERE city.site_level = 'city';
  SELECT count(*) INTO actual
    FROM public.sites AS city
    JOIN public.sites AS region_site ON region_site.id = city.parent_site_id
   WHERE city.site_level = 'city';
  IF actual <> expected THEN
    RAISE EXCEPTION 'jateng_city_network_incomplete: % of % city sites have a region parent', actual, expected;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sites AS city
      JOIN public.sites AS region_site ON region_site.id = city.parent_site_id
     WHERE city.site_level = 'city' AND region_site.site_level <> 'region'
  ) THEN
    RAISE EXCEPTION 'jateng_city_network_incomplete: a city site hangs from a non-region portal';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sites
     WHERE site_level = 'city' AND status = 'active' AND activation_state = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM public.site_settings AS settings
          WHERE settings.organization_id = sites.organization_id
            AND settings.site_id = sites.id
            AND settings.default_media_id IS NOT NULL
            AND settings.seo_default_title IS NOT NULL
            AND settings.seo_default_description IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'jateng_city_network_incomplete: an active city site lacks complete settings';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (177, 'jateng_city_network', 'sha256:d912f31603c0d9ce6629fe8770eed3cb1b81bb2e229128424a6d2091cdd7879e');
