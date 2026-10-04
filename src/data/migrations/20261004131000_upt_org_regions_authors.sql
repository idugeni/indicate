-- Wilayah + penulis default untuk 59 org UPT Jateng.
--
-- Org UPT lahir hanya dengan organizations + permissions + subscriptions +
-- publishers (seed upt-jateng-59org): tanpa regions, tanpa authors. Akibatnya
-- artikel tidak bisa dibuat atas nama mereka (validasi wilayah menolak,
-- penulis default jatuh ke authors[0]) dan dasbor mereka kosong selamanya.
-- Migrasi ini melengkapi tiap org UPT dengan provinsi Jawa Tengah, kota asal
-- (dari customer_metadata.city tanpa awalan Kab./Kota), dan satu author
-- Redaksi/Tim Redaksi, sehingga kreasi "atas nama org" punya rumahnya.
-- Idempoten: setiap INSERT dijaga NOT EXISTS (slug per org / display_name).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
INSERT INTO public.regions(organization_id, id, external_key, name, short_name, slug, status, kind, parent_region_id, version, created_at, updated_at)
SELECT o.id, gen_random_uuid(), 'upt-province-jawa-tengah', 'Jawa Tengah', 'Jateng', 'jawa-tengah', 'active', 'region', NULL, 1, now(), now()
FROM public.organizations o
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.organization_id = o.id AND r.slug = 'jawa-tengah');--> statement-breakpoint
WITH slugged AS (
  SELECT o.id AS organization_id,
    trim(BOTH '-' FROM regexp_replace(lower(NULLIF(regexp_replace(o.customer_metadata->>'city', '^(Kab\.|Kota)\s+', ''), '')), '[^a-z0-9]+', '-', 'g')) AS city_slug,
    NULLIF(regexp_replace(o.customer_metadata->>'city', '^(Kab\.|Kota)\s+', ''), '') AS city_name
  FROM public.organizations o
  WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
)
INSERT INTO public.regions(organization_id, id, external_key, name, short_name, slug, status, kind, parent_region_id, version, created_at, updated_at)
SELECT s.organization_id, gen_random_uuid(), 'upt-city-' || s.city_slug, s.city_name, NULL, s.city_slug, 'active', 'city', p.id, 1, now(), now()
FROM slugged s
JOIN public.regions p ON p.organization_id = s.organization_id AND p.slug = 'jawa-tengah'
WHERE s.city_slug IS NOT NULL AND s.city_slug <> '' AND s.city_slug <> 'jawa-tengah'
  AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.organization_id = s.organization_id AND r.slug = s.city_slug);--> statement-breakpoint
INSERT INTO public.authors(organization_id, id, display_name, byline, status, version, created_at, updated_at)
SELECT o.id, gen_random_uuid(), 'Redaksi', 'Tim Redaksi', 'active', 1, now(), now()
FROM public.organizations o
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND NOT EXISTS (SELECT 1 FROM public.authors a WHERE a.organization_id = o.id AND a.display_name = 'Redaksi');--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (255, 'upt_org_regions_authors', 'sha256:1f9319398d9f8eb56e4c9617ca81943dc8000dba1c9429d009406c2d27911eba');
