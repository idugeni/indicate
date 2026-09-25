-- Affiliasi resmi UPT ke portal kota per docs/tenants/upt-jateng.md.
--
-- The affiliation model was seeded with a single row (Rutan II B Wonosobo ->
-- `wonosobo.fakta01.my.id`). The documented map covers 59 UPT institutions
-- across 29 cities, and the ten Domains that run the prisoner-affiliation
-- network each publish that same city roster, so the verified claim is now
-- recorded for every (institution, city) pair on those Domains: 590 rows.
--
-- Scope note: the map is institutional, not per brand, so it is applied to the
-- ten Domains that carry the program. Extending it to the remaining 94 Domains
-- is the same statement without the Domain filter, should the owner decide the
-- claim should also appear on every brand.
--
-- Rows carry the same shape as the seeded one: `claim_scopes = ['site_name']`,
-- `evidence_reference = 'direktori-resmi'` (the official Kanwil Ditjenpas
-- directory the map was crossed with), `active` and `verified_at` set. The
-- guard block refuses to write unless every documented pair resolves to exactly
-- one publisher and one city geography, so a renamed institution fails the
-- migration instead of silently dropping a claim.
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
), network AS (
  SELECT organization_id, id AS domain_id
    FROM public.domains
   WHERE normalized_hostname IN (
     'fakta01.my.id', 'jurnalism.web.id', 'kabar360.biz.id', 'liputan99.web.id',
     'nusantara24.web.id', 'pantaunusantara.web.id', 'penamerdeka.my.id',
     'suarafakta24.biz.id', 'wartakini7.web.id', 'wawasannusa.biz.id'
   )
), resolved AS (
  SELECT network.organization_id,
         network.domain_id,
         geography.id AS region_id,
         source.publisher_name,
         publisher.id AS publisher_id,
         city_portal.id AS site_id
    FROM source
    JOIN network ON true
    JOIN public.regions AS geography
      ON geography.kind = 'city' AND geography.slug = source.city_slug
    JOIN public.publishers AS publisher
      ON publisher.organization_id = network.organization_id AND publisher.name = source.publisher_name
    JOIN public.sites AS city_portal
      ON city_portal.organization_id = network.organization_id
     AND city_portal.domain_id = network.domain_id
     AND city_portal.region_id = geography.id
     AND city_portal.site_level = 'city'
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
       'migration:upt_city_affiliations',
       'worker'::public.audit_entry_point,
       'affiliation.verify',
       'official_affiliation',
       site_id::text,
       'succeeded'::public.audit_outcome,
       ARRAY['publisherId', 'siteId', 'claimScopes', 'evidenceReference'],
       jsonb_build_object('claimScopes', ARRAY['site_name'], 'evidenceReference', 'direktori-resmi'),
       'migration:181'
  FROM inserted
 LIMIT ALL;--> statement-breakpoint
DO $$
DECLARE
  documented integer;
  resolved_pairs integer;
  written integer;
BEGIN
  SELECT count(*) INTO documented FROM (
    VALUES
      ('cilacap','LAPAS KELAS I BATU NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A BESI NUSAKAMBANGAN'),
      ('cilacap','LAPAS KHUSUS KELAS II A KARANGANYAR NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A KEMBANG KUNING NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II A GLADAKAN NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A KUMBANG NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II A NGASEMAN NUSAKAMBANGAN'),('cilacap','LAPAS NARKOTIKA KELAS II A NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II A PASIR PUTIH NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A PERMISAN NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II B NIRBAYA NUSAKAMBANGAN'),('cilacap','LAPAS TERBUKA KELAS II B NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II B CILACAP'),('cilacap','BAPAS KELAS II NUSAKAMBANGAN'),
      ('semarang','LAPAS KELAS I SEMARANG'),('semarang','LAPAS PEREMPUAN KELAS II A SEMARANG'),
      ('semarang','RUTAN KELAS I SEMARANG'),('semarang','BAPAS KELAS I SEMARANG'),('semarang','LAPAS KELAS II A AMBARAWA'),
      ('banyumas','LAPAS KELAS II A PURWOKERTO'),('banyumas','LAPAS NARKOTIKA KELAS II B PURWOKERTO'),
      ('banyumas','RUTAN KELAS II B BANYUMAS'),('banyumas','BAPAS KELAS II PURWOKERTO'),
      ('kendal','LAPAS KELAS II A KENDAL'),('kendal','LAPAS TERBUKA KELAS II B KENDAL'),('kendal','LAPAS PEMUDA KELAS II B PLANTUNGAN'),
      ('pekalongan','LAPAS KELAS II A PEKALONGAN'),('pekalongan','RUTAN KELAS II A PEKALONGAN'),('pekalongan','BAPAS KELAS II PEKALONGAN'),
      ('magelang','LAPAS KELAS II A MAGELANG'),('magelang','BAPAS KELAS II MAGELANG'),
      ('tegal','LAPAS KELAS II B TEGAL'),('tegal','LAPAS KELAS II B SLAWI'),
      ('klaten','LAPAS KELAS II B KLATEN'),('klaten','BAPAS KELAS II KLATEN'),
      ('pati','LAPAS KELAS II B PATI'),('pati','BAPAS KELAS II PATI'),
      ('purworejo','LPKA KELAS I KUTOARJO'),('purworejo','RUTAN KELAS II B PURWOREJO'),
      ('surakarta','RUTAN KELAS I SURAKARTA'),('surakarta','BAPAS KELAS I SURAKARTA'),
      ('banjarnegara','RUTAN KELAS II B BANJARNEGARA'),('batang','LAPAS KELAS II B BATANG'),
      ('blora','RUTAN KELAS II B BLORA'),('boyolali','RUTAN KELAS II B BOYOLALI'),
      ('brebes','LAPAS KELAS II B BREBES'),('demak','RUTAN KELAS II B DEMAK'),
      ('grobogan','LAPAS KELAS II B PURWODADI'),('jepara','RUTAN KELAS II B JEPARA'),
      ('kebumen','RUTAN KELAS II B KEBUMEN'),('kudus','RUTAN KELAS II B KUDUS'),
      ('pemalang','RUTAN KELAS II B PEMALANG'),('purbalingga','RUTAN KELAS II B PURBALINGGA'),
      ('rembang','RUTAN KELAS II B REMBANG'),('salatiga','RUTAN KELAS II B SALATIGA'),
      ('sragen','LAPAS KELAS II A SRAGEN'),('temanggung','RUTAN KELAS II B TEMANGGUNG'),
      ('wonogiri','LAPAS KELAS II B WONOGIRI'),('wonosobo','RUTAN KELAS II B WONOSOBO')
  ) AS documented_pairs(city_slug, publisher_name);

  SELECT count(*) INTO resolved_pairs
    FROM (VALUES
      ('cilacap','LAPAS KELAS I BATU NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A BESI NUSAKAMBANGAN'),
      ('cilacap','LAPAS KHUSUS KELAS II A KARANGANYAR NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A KEMBANG KUNING NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II A GLADAKAN NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A KUMBANG NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II A NGASEMAN NUSAKAMBANGAN'),('cilacap','LAPAS NARKOTIKA KELAS II A NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II A PASIR PUTIH NUSAKAMBANGAN'),('cilacap','LAPAS KELAS II A PERMISAN NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II B NIRBAYA NUSAKAMBANGAN'),('cilacap','LAPAS TERBUKA KELAS II B NUSAKAMBANGAN'),
      ('cilacap','LAPAS KELAS II B CILACAP'),('cilacap','BAPAS KELAS II NUSAKAMBANGAN'),
      ('semarang','LAPAS KELAS I SEMARANG'),('semarang','LAPAS PEREMPUAN KELAS II A SEMARANG'),
      ('semarang','RUTAN KELAS I SEMARANG'),('semarang','BAPAS KELAS I SEMARANG'),('semarang','LAPAS KELAS II A AMBARAWA'),
      ('banyumas','LAPAS KELAS II A PURWOKERTO'),('banyumas','LAPAS NARKOTIKA KELAS II B PURWOKERTO'),
      ('banyumas','RUTAN KELAS II B BANYUMAS'),('banyumas','BAPAS KELAS II PURWOKERTO'),
      ('kendal','LAPAS KELAS II A KENDAL'),('kendal','LAPAS TERBUKA KELAS II B KENDAL'),('kendal','LAPAS PEMUDA KELAS II B PLANTUNGAN'),
      ('pekalongan','LAPAS KELAS II A PEKALONGAN'),('pekalongan','RUTAN KELAS II A PEKALONGAN'),('pekalongan','BAPAS KELAS II PEKALONGAN'),
      ('magelang','LAPAS KELAS II A MAGELANG'),('magelang','BAPAS KELAS II MAGELANG'),
      ('tegal','LAPAS KELAS II B TEGAL'),('tegal','LAPAS KELAS II B SLAWI'),
      ('klaten','LAPAS KELAS II B KLATEN'),('klaten','BAPAS KELAS II KLATEN'),
      ('pati','LAPAS KELAS II B PATI'),('pati','BAPAS KELAS II PATI'),
      ('purworejo','LPKA KELAS I KUTOARJO'),('purworejo','RUTAN KELAS II B PURWOREJO'),
      ('surakarta','RUTAN KELAS I SURAKARTA'),('surakarta','BAPAS KELAS I SURAKARTA'),
      ('banjarnegara','RUTAN KELAS II B BANJARNEGARA'),('batang','LAPAS KELAS II B BATANG'),
      ('blora','RUTAN KELAS II B BLORA'),('boyolali','RUTAN KELAS II B BOYOLALI'),
      ('brebes','LAPAS KELAS II B BREBES'),('demak','RUTAN KELAS II B DEMAK'),
      ('grobogan','LAPAS KELAS II B PURWODADI'),('jepara','RUTAN KELAS II B JEPARA'),
      ('kebumen','RUTAN KELAS II B KEBUMEN'),('kudus','RUTAN KELAS II B KUDUS'),
      ('pemalang','RUTAN KELAS II B PEMALANG'),('purbalingga','RUTAN KELAS II B PURBALINGGA'),
      ('rembang','RUTAN KELAS II B REMBANG'),('salatiga','RUTAN KELAS II B SALATIGA'),
      ('sragen','LAPAS KELAS II A SRAGEN'),('temanggung','RUTAN KELAS II B TEMANGGUNG'),
      ('wonogiri','LAPAS KELAS II B WONOGIRI'),('wonosobo','RUTAN KELAS II B WONOSOBO')
    ) AS pair(city_slug, publisher_name)
    JOIN public.publishers AS publisher
      ON publisher.name = pair.publisher_name
     AND publisher.organization_id = (SELECT organization_id FROM public.domains LIMIT 1)
    JOIN public.regions AS geography
      ON geography.kind = 'city' AND geography.slug = pair.city_slug
     AND geography.organization_id = publisher.organization_id;

  SELECT count(*) INTO written
    FROM public.official_affiliations
   WHERE evidence_reference = 'direktori-resmi'
     AND organization_id = (SELECT organization_id FROM public.domains LIMIT 1);

  IF documented <> 59 THEN
    RAISE EXCEPTION 'upt_affiliation_incomplete: % documented pairs, expected 59', documented;
  END IF;
  IF resolved_pairs <> 59 THEN
    RAISE EXCEPTION 'upt_affiliation_incomplete: % of 59 pairs resolve to a publisher and city', resolved_pairs;
  END IF;
  IF written <> documented * 10 THEN
    RAISE EXCEPTION 'upt_affiliation_incomplete: % affiliations for % pairs across 10 domains', written, documented;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (181, 'upt_city_affiliations', 'sha256:0c68732ca20f78d10005ac6d84d9965bda607a7dd2d991bc9e6992845815855d');
