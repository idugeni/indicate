-- Reproduce the newsroom author profile that migration 187 applied out of band.
--
-- Production carries a ledger row 187 named `author_newsroom_profile` whose SQL
-- was never committed to this repository. It left no schema object behind; its
-- entire effect is the newsroom author row: on 2026-09-25 15:29 UTC it wrote the
-- editorial policy into `bio`, pointed `avatar_url` at the brand mark, set
-- `website_url`, and moved the row to version 3. A database built from
-- `bootstrap/indicate-schema.sql` therefore ends up without that content while
-- production has it, and the checksum of 187 can never be matched because only
-- the digest survived.
--
-- The checksum stays untouched: rewriting a ledger row to match a file nobody
-- wrote would falsify the record. Instead this forward migration states the
-- effect explicitly and idempotently, so a fresh environment converges on the
-- same author profile. On production it matches zero rows and costs nothing: the
-- UPDATE is guarded by `IS DISTINCT FROM`, so no version churn on a row that is
-- already correct.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
UPDATE public.authors AS author
   SET bio = 'Tim redaksi Indicate menghimpun, memverifikasi, dan menyunting laporan yang dikirim oleh lembaga pemasyarakatan, balai pemasyarakatan, dan rumah tahanan di seluruh jaringan, sebelum dimuat pada portal mitra. Setiap naskah disusun dari sumber resmi yang dapat ditelusuri, lalu melalui dua tahap pemeriksaan: verifikasi faktual terhadap dokumen sumber, dan penyuntingan bahasa, struktur, serta konsistensi nama lembaga. Redaksi menolak naskah yang memuat klaim tanpa rujukan, tidak mencantumkan data pribadi yang tidak berkaitan dengan kepentingan publik, dan menyiarkan setiap perubahan isi sebagai koreksi terbuka. Naskah yang belum dinyatakan lolos verifikasi tidak pernah dipublikasikan. Pembaca dapat menyampaikan konfirmasi, tanggapan, atau permintaan koreksi melalui kanal resmi masing-masing portal mitra.',
       avatar_url = '/brand/indicate-mark.svg',
       website_url = 'https://indicate.website',
       version = author.version + 1,
       updated_at = now()
 WHERE author.display_name = 'Redaksi'
   AND author.organization_id = (SELECT id FROM public.organizations WHERE kind = 'operator')
   AND (author.bio IS DISTINCT FROM 'Tim redaksi Indicate menghimpun, memverifikasi, dan menyunting laporan yang dikirim oleh lembaga pemasyarakatan, balai pemasyarakatan, dan rumah tahanan di seluruh jaringan, sebelum dimuat pada portal mitra. Setiap naskah disusun dari sumber resmi yang dapat ditelusuri, lalu melalui dua tahap pemeriksaan: verifikasi faktual terhadap dokumen sumber, dan penyuntingan bahasa, struktur, serta konsistensi nama lembaga. Redaksi menolak naskah yang memuat klaim tanpa rujukan, tidak mencantumkan data pribadi yang tidak berkaitan dengan kepentingan publik, dan menyiarkan setiap perubahan isi sebagai koreksi terbuka. Naskah yang belum dinyatakan lolos verifikasi tidak pernah dipublikasikan. Pembaca dapat menyampaikan konfirmasi, tanggapan, atau permintaan koreksi melalui kanal resmi masing-masing portal mitra.'
     OR author.avatar_url IS DISTINCT FROM '/brand/indicate-mark.svg'
     OR author.website_url IS DISTINCT FROM 'https://indicate.website');--> statement-breakpoint
DO $$
DECLARE
  reconciled integer;
  operator_orgs integer;
BEGIN
  SELECT count(*) INTO operator_orgs FROM public.organizations WHERE kind = 'operator';
  IF operator_orgs <> 1 THEN
    RAISE EXCEPTION 'newsroom_profile_ambiguous: % operator organizations, expected exactly 1', operator_orgs;
  END IF;
  SELECT count(*) INTO reconciled FROM public.authors AS author
   WHERE author.display_name = 'Redaksi'
     AND author.organization_id = (SELECT id FROM public.organizations WHERE kind = 'operator')
     AND author.bio IS NOT NULL
     AND author.avatar_url = '/brand/indicate-mark.svg'
     AND author.website_url = 'https://indicate.website';
  IF reconciled <> 1 THEN
    RAISE EXCEPTION 'newsroom_profile_missing: % reconciled newsroom author row(s), expected 1', reconciled;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (192, 'reconcile_author_newsroom_profile', 'sha256:df9dae7264942a084e1840ce2a2baac313fa1c4e9619766805ed7a9dbffdeecb');
