-- Extend the UPT city affiliations to every Domain.
--
-- Migration v181 recorded the documented 59 institutional claims on the ten
-- domains that run the prisoner-affiliation network. Every Domain now carries
-- the same 31-city Jawa Tengah roster, so the same verified institutional
-- relationship applies to each of them: 59 x 104 = 6136 rows, of which 590 are
-- already present. The claim shape is unchanged (`claim_scopes=['site_name']`,
-- `evidence_reference='direktori-resmi'`, active and verified), the institution
-- name always comes from the publisher record rather than the request, and the
-- guard block still refuses to write unless all 59 pairs resolve to exactly one
-- publisher and one city geography and the total reaches 59 per Domain.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
WITH source(city_slug, publisher_name) AS (
  VALUES
    ('cilacap', 'LAPAS KELAS I BATU NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II A BESI NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KHUSUS KELAS II A KARANGANYAR NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II A KEMBANG KUNING NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II A GLADAKAN NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II A KUMBANG NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II A NGASEMAN NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS NARKOTIKA KELAS II A NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II A PASIR PUTIH NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II A PERMISAN NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II B NIRBAYA NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS TERBUKA KELAS II B NUSAKAMBANGAN'),
    ('cilacap', 'LAPAS KELAS II B CILACAP'),
    ('cilacap', 'BAPAS KELAS II NUSAKAMBANGAN'),
    ('semarang', 'LAPAS KELAS I SEMARANG'),
    ('semarang', 'LAPAS PEREMPUAN KELAS II A SEMARANG'),
    ('semarang', 'RUTAN KELAS I SEMARANG'),
    ('semarang', 'BAPAS KELAS I SEMARANG'),
    ('semarang', 'LAPAS KELAS II A AMBARAWA'),
    ('banyumas', 'LAPAS KELAS II A PURWOKERTO'),
    ('banyumas', 'LAPAS NARKOTIKA KELAS II B PURWOKERTO'),
    ('banyumas', 'RUTAN KELAS II B BANYUMAS'),
    ('banyumas', 'BAPAS KELAS II PURWOKERTO'),
    ('kendal', 'LAPAS KELAS II A KENDAL'),
    ('kendal', 'LAPAS TERBUKA KELAS II B KENDAL'),
    ('kendal', 'LAPAS PEMUDA KELAS II B PLANTUNGAN'),
    ('pekalongan', 'LAPAS KELAS II A PEKALONGAN'),
    ('pekalongan', 'RUTAN KELAS II A PEKALONGAN'),
    ('pekalongan', 'BAPAS KELAS II PEKALONGAN'),
    ('magelang', 'LAPAS KELAS II A MAGELANG'),
    ('magelang', 'BAPAS KELAS II MAGELANG'),
    ('tegal', 'LAPAS KELAS II B TEGAL'),
    ('tegal', 'LAPAS KELAS II B SLAWI'),
    ('klaten', 'LAPAS KELAS II B KLATEN'),
    ('klaten', 'BAPAS KELAS II KLATEN'),
    ('pati', 'LAPAS KELAS II B PATI'),
    ('pati', 'BAPAS KELAS II PATI'),
    ('purworejo', 'LPKA KELAS I KUTOARJO'),
    ('purworejo', 'RUTAN KELAS II B PURWOREJO'),
    ('surakarta', 'RUTAN KELAS I SURAKARTA'),
    ('surakarta', 'BAPAS KELAS I SURAKARTA'),
    ('banjarnegara', 'RUTAN KELAS II B BANJARNEGARA'),
    ('batang', 'LAPAS KELAS II B BATANG'),
    ('blora', 'RUTAN KELAS II B BLORA'),
    ('boyolali', 'RUTAN KELAS II B BOYOLALI'),
    ('brebes', 'LAPAS KELAS II B BREBES'),
    ('demak', 'RUTAN KELAS II B DEMAK'),
    ('grobogan', 'LAPAS KELAS II B PURWODADI'),
    ('jepara', 'RUTAN KELAS II B JEPARA'),
    ('kebumen', 'RUTAN KELAS II B KEBUMEN'),
    ('kudus', 'RUTAN KELAS II B KUDUS'),
    ('pemalang', 'RUTAN KELAS II B PEMALANG'),
    ('purbalingga', 'RUTAN KELAS II B PURBALINGGA'),
    ('rembang', 'RUTAN KELAS II B REMBANG'),
    ('salatiga', 'RUTAN KELAS II B SALATIGA'),
    ('sragen', 'LAPAS KELAS II A SRAGEN'),
    ('temanggung', 'RUTAN KELAS II B TEMANGGUNG'),
    ('wonogiri', 'LAPAS KELAS II B WONOGIRI'),
    ('wonosobo', 'RUTAN KELAS II B WONOSOBO')
), resolved AS (
  SELECT geography.organization_id,
         network.id AS domain_id,
         source.publisher_name,
         publisher.id AS publisher_id,
         city_portal.id AS site_id
    FROM source
    JOIN public.regions AS geography
      ON geography.kind = 'city' AND geography.slug = source.city_slug
    JOIN public.publishers AS publisher
      ON publisher.organization_id = geography.organization_id AND publisher.name = source.publisher_name
    JOIN public.sites AS city_portal
      ON city_portal.organization_id = geography.organization_id
     AND city_portal.region_id = geography.id
     AND city_portal.site_level = 'city'
    JOIN public.domains AS network
      ON network.organization_id = geography.organization_id
     AND network.id = city_portal.domain_id
), inserted AS (
  INSERT INTO public.official_affiliations (
    organization_id, id, publisher_id, site_id, institution_name, claim_scopes,
    evidence_reference, active, verified_at, version, created_at, updated_at
  )
  SELECT resolved.organization_id,
         gen_random_uuid(),
         resolved.publisher_id,
         resolved.site_id,
         resolved.publisher_name,
         ARRAY['site_name']::text[],
         'direktori-resmi',
         true,
         now(),
         1,
         now(),
         now()
    FROM resolved
   WHERE NOT EXISTS (
     SELECT 1 FROM public.official_affiliations AS existing
      WHERE existing.organization_id = resolved.organization_id
        AND existing.publisher_id = resolved.publisher_id
        AND existing.site_id = resolved.site_id
   )
  RETURNING organization_id, site_id
)
INSERT INTO public.audit_logs (
  organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id,
  outcome, changed_fields, after, request_id
)
SELECT DISTINCT organization_id,
       gen_random_uuid(),
       'system'::public.audit_actor_type,
       'migration:upt_city_affiliations_all_domains',
       'worker'::public.audit_entry_point,
       'affiliation.verify',
       'official_affiliation',
       site_id::text,
       'succeeded'::public.audit_outcome,
       ARRAY['publisherId', 'siteId', 'claimScopes', 'evidenceReference'],
       jsonb_build_object('claimScopes', ARRAY['site_name'], 'evidenceReference', 'direktori-resmi'),
       'migration:184'
  FROM inserted
 LIMIT ALL;--> statement-breakpoint
DO $$
DECLARE
  domains_total integer;
  per_domain integer;
  minimum_per_domain integer;
  maximum_per_domain integer;
  on_non_city integer;
BEGIN
  SELECT count(*) INTO domains_total FROM public.domains;

  SELECT min(claims), max(claims) INTO minimum_per_domain, maximum_per_domain
    FROM (
      SELECT site.domain_id, count(a.id) AS claims
        FROM public.sites AS site
        JOIN public.official_affiliations AS a ON a.site_id = site.id
       WHERE site.site_level = 'city'
       GROUP BY site.domain_id
    ) AS per_domain_rows;

  SELECT count(*) INTO per_domain
    FROM public.official_affiliations
   WHERE evidence_reference = 'direktori-resmi';

  SELECT count(*) INTO on_non_city
    FROM public.official_affiliations AS a
    JOIN public.sites AS s ON s.id = a.site_id
   WHERE s.site_level <> 'city';

  IF minimum_per_domain IS NULL OR minimum_per_domain <> 59 OR maximum_per_domain <> 59 THEN
    RAISE EXCEPTION 'upt_affiliation_incomplete: per-domain claims range %, expected 59', minimum_per_domain;
  END IF;
  IF per_domain <> 59 * domains_total THEN
    RAISE EXCEPTION 'upt_affiliation_incomplete: % claims for 59 institutions across % domains', per_domain, domains_total;
  END IF;
  IF on_non_city > 0 THEN
    RAISE EXCEPTION 'upt_affiliation_incomplete: % claims landed on a non-city portal', on_non_city;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (184, 'upt_city_affiliations_all_domains', 'sha256:ac56dfee648bf3b7205de8498021a03241de401216e0d1b1788d6cad913d4cd4');
