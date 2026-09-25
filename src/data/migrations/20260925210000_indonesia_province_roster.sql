-- Seed the national province roster and give every geography a short public name.
--
-- The network carried a single province, Jawa Tengah, because that was the
-- pilot. Operators need the whole archipelago available before any of it is
-- published: a city roster can only attach to a province that exists, and
-- `regions` is the parent every city geography and every region portal hangs
-- from. This migration writes all 38 first-level provinces for every
-- organization that already carries geography. It is data only, so nothing
-- customer-visible changes: no portal, no site, no hostname, no cache entry.
--
-- Naming has three jobs and therefore three fields:
--   name       official name, shown to readers and used in SEO text
--   short_name familiar public label (Jateng, Jabar, DIY) for dense UI
--   slug       DNS label, formal kebab, matching the city slugs already live
--              (`banjarnegara`, `surakarta`) and the existing
--              `jawa-tengah.{apex}` region portals, so no live hostname moves
-- `external_key` stays the machine key and keeps following the slug, which is
-- what the dashboard region form has always written and what nothing else in
-- the schema references.
--
-- `short_name` is nullable on purpose: a geography without a well-known short
-- form should not invent one, and readers fall back to `name`.
--
-- This is version 188, not 187. Production already carries a ledger row 187
-- named `author_newsroom_profile`, applied outside this repository; it left no
-- schema object behind, so the sequence simply continues past it and the ledger
-- stays monotonic. The gap is recorded here so nobody renumbers into it.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.regions ADD COLUMN short_name text;--> statement-breakpoint
ALTER TABLE public.regions
  ADD CONSTRAINT regions_short_name_length_check
  CHECK (short_name IS NULL OR char_length(short_name) BETWEEN 1 AND 40);--> statement-breakpoint
INSERT INTO public.regions (
  organization_id, id, external_key, name, short_name, slug, status, kind, parent_region_id, version
)
SELECT tenant.organization_id,
       gen_random_uuid(),
       roster.slug,
       roster.name,
       roster.short_name,
       roster.slug,
       'active'::public.record_status,
       'region'::public.region_kind,
       NULL,
       1
  FROM (VALUES
    ('Aceh', 'Aceh', 'aceh'),
    ('Sumatera Utara', 'Sumut', 'sumatera-utara'),
    ('Sumatera Barat', 'Sumbar', 'sumatera-barat'),
    ('Riau', 'Riau', 'riau'),
    ('Jambi', 'Jambi', 'jambi'),
    ('Sumatera Selatan', 'Sumsel', 'sumatera-selatan'),
    ('Bengkulu', 'Bengkulu', 'bengkulu'),
    ('Lampung', 'Lampung', 'lampung'),
    ('Kepulauan Bangka Belitung', 'Babel', 'bangka-belitung'),
    ('Kepulauan Riau', 'Kepri', 'kepulauan-riau'),
    ('Daerah Khusus Jakarta', 'DKI', 'dki-jakarta'),
    ('Jawa Barat', 'Jabar', 'jawa-barat'),
    ('Daerah Istimewa Yogyakarta', 'DIY', 'di-yogyakarta'),
    ('Jawa Timur', 'Jatim', 'jawa-timur'),
    ('Banten', 'Banten', 'banten'),
    ('Bali', 'Bali', 'bali'),
    ('Nusa Tenggara Barat', 'NTB', 'nusa-tenggara-barat'),
    ('Nusa Tenggara Timur', 'NTT', 'nusa-tenggara-timur'),
    ('Kalimantan Barat', 'Kalbar', 'kalimantan-barat'),
    ('Kalimantan Tengah', 'Kalteng', 'kalimantan-tengah'),
    ('Kalimantan Selatan', 'Kalsel', 'kalimantan-selatan'),
    ('Kalimantan Timur', 'Kaltim', 'kalimantan-timur'),
    ('Kalimantan Utara', 'Kalut', 'kalimantan-utara'),
    ('Sulawesi Utara', 'Sulut', 'sulawesi-utara'),
    ('Sulawesi Tengah', 'Sulteng', 'sulawesi-tengah'),
    ('Sulawesi Selatan', 'Sulsel', 'sulawesi-selatan'),
    ('Sulawesi Tenggara', 'Sultra', 'sulawesi-tenggara'),
    ('Gorontalo', 'Gorontalo', 'gorontalo'),
    ('Sulawesi Barat', 'Sulbar', 'sulawesi-barat'),
    ('Maluku', 'Maluku', 'maluku'),
    ('Maluku Utara', 'Malut', 'maluku-utara'),
    ('Papua Barat', 'Papua Barat', 'papua-barat'),
    ('Papua Barat Daya', 'Papua Barat Daya', 'papua-barat-daya'),
    ('Papua', 'Papua', 'papua'),
    ('Papua Selatan', 'Papua Selatan', 'papua-selatan'),
    ('Papua Tengah', 'Papua Tengah', 'papua-tengah'),
    ('Papua Pegunungan', 'Papua Pegunungan', 'papua-pegunungan')
  ) AS roster(name, short_name, slug)
  CROSS JOIN (SELECT DISTINCT organization_id FROM public.regions) AS tenant
 WHERE NOT EXISTS (
         SELECT 1 FROM public.regions AS existing
          WHERE existing.organization_id = tenant.organization_id
            AND existing.slug = roster.slug
       );--> statement-breakpoint
UPDATE public.regions
   SET short_name = 'Jateng'
 WHERE slug = 'jawa-tengah' AND kind = 'region' AND short_name IS NULL;--> statement-breakpoint
DO $$
DECLARE
  tenants integer;
  provinces integer;
  cities integer;
  incomplete integer;
  collisions text;
  orphan_portals integer;
BEGIN
  SELECT count(DISTINCT organization_id) INTO tenants FROM public.regions;
  SELECT count(*) INTO provinces FROM public.regions WHERE kind = 'region';
  SELECT count(*) INTO cities FROM public.regions WHERE kind = 'city';
  IF provinces <> tenants * 38 THEN
    RAISE EXCEPTION 'province_roster_incomplete: % provinces for % tenant(s), expected %', provinces, tenants, tenants * 38;
  END IF;
  IF cities <> tenants * 31 THEN
    RAISE EXCEPTION 'province_roster_changed: % cities for % tenant(s), expected %', cities, tenants, tenants * 31;
  END IF;
  SELECT count(*) INTO incomplete
    FROM public.regions
   WHERE kind = 'region' AND (short_name IS NULL OR parent_region_id IS NOT NULL OR status <> 'active');
  IF incomplete > 0 THEN
    RAISE EXCEPTION 'province_roster_incomplete: % province row(s) without a short name, a parent, or active status', incomplete;
  END IF;
  SELECT string_agg(format('%s (city %s) = %s (province)', city.slug, city.name, province.name), ', ')
    INTO collisions
    FROM public.regions AS province
    JOIN public.regions AS city
      ON city.organization_id = province.organization_id
     AND city.kind = 'city'
     AND province.kind = 'region'
     AND city.slug = province.slug;
  IF collisions IS NOT NULL THEN
    RAISE EXCEPTION 'province_roster_incomplete: slug collision %', collisions;
  END IF;
  SELECT count(*) INTO orphan_portals
    FROM public.sites
   WHERE site_level <> 'apex'
     AND NOT EXISTS (
       SELECT 1 FROM public.regions AS geography
        WHERE geography.organization_id = sites.organization_id
          AND geography.id = sites.region_id
     );
  IF orphan_portals > 0 THEN
    RAISE EXCEPTION 'province_roster_incomplete: % derived portal(s) lost their geography', orphan_portals;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (188, 'indonesia_province_roster', 'sha256:b1c106df4e7eda822f6595b102e1eff4b2b2ef4f0b58bdfc2b03ddd65167dc3d');
