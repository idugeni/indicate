-- Give every tenant apex the Turnstile site key that authorizes its report form.
--
-- Cloudflare Turnstile binds a widget to an explicit hostname allowlist, and the
-- plan behind this account caps that list at ten hostnames per widget. One widget
-- therefore cannot serve the 134 apexes, and a widget whose list omits the
-- requesting hostname fails to render there, which would make every tenant
-- report submission unverifiable. Fourteen widgets of ten apexes each (the last
-- carries four) cover the network, and this column records which widget serves
-- which apex.
--
-- The column is nullable on purpose: a domain provisioned after this migration,
-- or any non-tenant domain, has no widget yet, and the report form then runs
-- unchallenged under the per-host and per-client-IP rate limits rather than
-- pointing at a widget that cannot authorize the hostname. Onboarding stays
-- DB-only: add the apex to a widget, set this column, and the form is covered.
--
-- One apex entry also authorizes its subdomains, so the regional
-- (`{region}.{apex}`) and city (`{city}.{apex}`) portals of each tenant are
-- covered by their apex without further rows.

ALTER TABLE public.domains
  ADD COLUMN IF NOT EXISTS report_challenge_sitekey text;
--> statement-breakpoint
ALTER TABLE public.domains
  DROP CONSTRAINT IF EXISTS domains_report_challenge_sitekey_format;
--> statement-breakpoint
ALTER TABLE public.domains
  ADD CONSTRAINT domains_report_challenge_sitekey_format
  CHECK (report_challenge_sitekey IS NULL OR report_challenge_sitekey ~ '^0x[0-9A-Za-z_-]{10,64}$');
--> statement-breakpoint
UPDATE public.domains AS d
SET report_challenge_sitekey = v.report_challenge_sitekey,
    updated_at = now()
FROM (VALUES
    ('arsip24publik.biz.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('artikulasi.biz.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('aspirasi.biz.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('bacazaman.web.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('bahariraya.biz.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('bentangkata.biz.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('bentara9.web.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('berandafakta.biz.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('berandafakta.my.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('berandainvestigasi.biz.id', '0x4AAAAAAFHN_lpLqmLytOD5'),
    ('berandanasional.web.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('bidik24perkara.biz.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('bidikan.my.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('bilik7wacana.web.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('cakrawalakata.web.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('cermin24berita.web.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('denyutpublik.my.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('eksposur.web.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('fakta01.my.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('faktura.web.id', '0x4AAAAAAFHN_wpbzZzuubXj'),
    ('fokusrakyat.my.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('fokusrakyat.web.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('garisberita.web.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('garisfakta.web.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('gatrapublik.web.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('gerbanginvestigasi.my.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('gerbangkata.web.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('guratfakta.biz.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('guratfakta.my.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('independensi.my.id', '0x4AAAAAAFHOAAQPpr6CqLFW'),
    ('interpretasi.web.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jajakperkara.my.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jalurperkara.web.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jaring9perkara.web.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jejakkebenaran.my.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jejakwacana.my.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jendelapublik.my.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jurnalism.web.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('jurnalpas.web.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('kabar360.biz.id', '0x4AAAAAAFHOAa0mgne_23xm'),
    ('kabarutama.web.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('keberimbangan.biz.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('kelanaberita.web.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('kepulauanraya.web.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('kilatan.my.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('konstelasi.my.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('kredibilitas.biz.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('larasfakta.biz.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('larikberita.biz.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('lensakita24.my.id', '0x4AAAAAAFHOAo4JFfSZDZPs'),
    ('lensamata.web.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('lensaperistiwa.my.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('lintaskarya.my.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('lintasperbatasan.web.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('liputan99.web.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('lontarpublik.web.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('mediasatu24.biz.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('metroinvestigasi.web.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('muarafakta.my.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('nalarharian.my.id', '0x4AAAAAAFHOA_RuX8VJDSpZ'),
    ('narasipublik.biz.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('nawalaperkara.biz.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('nusantara24.web.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('nusantaramerdeka.my.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('objektivitas.biz.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('observasi.web.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('panggungkata.biz.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('panggungkata.my.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('pantaunusantara.web.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('pastipas.biz.id', '0x4AAAAAAFHOBNPiIa4CFSrh'),
    ('penamerdeka.my.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('pendarkata.biz.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('pendarkata.web.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('penyanggafakta.biz.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('persmerdeka.web.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('petawacana.biz.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('pijar7kata.my.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('pikiranpublik.web.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('podiumpublik.web.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('poroswacana.web.id', '0x4AAAAAAFHOBRXaRhQXV-4s'),
    ('potretwacana.my.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('prabawacana.my.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('proyeksi.web.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('pusatmedia.biz.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('rantau.biz.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('ranumcerita.biz.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('ranumcerita.my.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('refleksi.biz.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('rekamwacana.web.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('rentetan.biz.id', '0x4AAAAAAFHOBpGPvPTrJ8rF'),
    ('resonansi.web.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('rona24.my.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('ronafakta.biz.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('ruangpublik.web.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('ruangredaksi.web.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('ruangsela.web.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('runcing.biz.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('sela7perkara.my.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('serambifakta.my.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('sigapan.web.id', '0x4AAAAAAFHOBxfRdjhznYoZ'),
    ('sigapta.my.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('sigi9perkara.biz.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('simpul7perkara.biz.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('sinarperkara.biz.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('sintesa.biz.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('sorotwacana.biz.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('suarabening.biz.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('suarabening.web.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('suarabentara.biz.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('suaradata.web.id', '0x4AAAAAAFHOCb3BZAOX6Kb'),
    ('suarafakta24.biz.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('suarakepulauan.my.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('suarapublik.biz.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('sudutfakta7.my.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('sudutindonesia.web.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('sulukfakta.biz.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('takarwacana.biz.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('takarwacana.web.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('tandas.web.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('telusurfakta.my.id', '0x4AAAAAAFHOCfGrPYsZjBu5'),
    ('terasberita.web.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('terobosan.my.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('timbang7perkara.my.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('timbangan.my.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('titik9wacana.my.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('titikberita9.biz.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('titikmedia.my.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('transpas.web.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('validitas.web.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('wargamerdeka.biz.id', '0x4AAAAAAFHOCgmhkipf-a_B'),
    ('wartakini7.web.id', '0x4AAAAAAFHOC2L14jtmpFgO'),
    ('wartapersada.my.id', '0x4AAAAAAFHOC2L14jtmpFgO'),
    ('wartaria.biz.id', '0x4AAAAAAFHOC2L14jtmpFgO'),
    ('wawasannusa.biz.id', '0x4AAAAAAFHOC2L14jtmpFgO')
  ) AS v(normalized_hostname, report_challenge_sitekey)
WHERE d.normalized_hostname = v.normalized_hostname;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (218, 'report_challenge_sitekey', 'sha256:3a28a97cbef227636c37a639bed6d71f8183e3a2a239a2dda5a585cacced6b04');
