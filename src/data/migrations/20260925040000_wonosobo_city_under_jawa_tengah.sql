-- Promote Wonosobo from region to city under a Jawa Tengah parent.
--
-- Kabupaten Wonosobo is administratively city-level; the single live region
-- row carried kind='region' only because no parent existed. Code requires
-- cities to have exactly one parent (dashboard validation + DB check
-- regions_kind_parent_consistent), so this inserts the Jawa Tengah parent
-- first, then repoints Wonosobo. Site rows keep their region_id (same row
-- id), so resolution, RLS scoping, and routing are untouched; city publishes
-- additionally report an informational unresolved region copy until parent
-- region sites exist (see site-cascade).
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.regions(organization_id, id, external_key, name, slug, status, kind, parent_region_id, version, created_at, updated_at)
SELECT organization_id, gen_random_uuid(), 'jawa-tengah', 'Jawa Tengah', 'jawa-tengah', 'active', 'region', NULL, 1, now(), now()
FROM public.regions WHERE slug = 'wonosobo' AND kind = 'region'
ON CONFLICT (organization_id, external_key) DO NOTHING;--> statement-breakpoint
UPDATE public.regions AS child SET kind = 'city', parent_region_id = parent.id, version = child.version + 1, updated_at = now()
FROM public.regions AS parent
WHERE child.slug = 'wonosobo' AND child.kind = 'region'
AND parent.slug = 'jawa-tengah' AND parent.kind = 'region'
AND parent.organization_id = child.organization_id;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (172, 'wonosobo_city_under_jawa_tengah', 'sha256:8f3a8728e976121d79602ec113f7d24e71c567b8d6943925894e9e67faef8018');
