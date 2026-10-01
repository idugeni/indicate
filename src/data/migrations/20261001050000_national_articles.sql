-- Artikel nasional: region_id boleh NULL untuk berita yang tayang ke semua apex utama.
--
-- Sebelumnya setiap artikel wajib membawa satu geografi (provinsi atau kota),
-- sehingga redaksi yang ingin menerbitkan berita nasional ke seluruh portal
-- apex tetap dipaksa memilih satu wilayah di UI. NULL berarti nasional:
-- taksonomi tanpa wilayah, hanya boleh ditulis aktor tanpa kunci wilayah
-- (admin), dan hanya didistribusikan ke portal apex (tanpa kota berarti
-- scope apex di selectPublicationTargets).
--
-- RLS sengaja tidak diubah: predikat yang ada (`region_id = current`)
-- bernilai tidak-benar untuk NULL, sehingga baris nasional tetap
-- tersembunyi dari aktor terkunci wilayah — selaras dengan articleInScope
-- di aplikasi. Membukanya untuk aktor terkunci adalah tindak lanjut
-- terpisah (tambah `OR region_id IS NULL` di kebijakan articles dan
-- turunannya).
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.articles ALTER COLUMN region_id DROP NOT NULL;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (241, 'national_articles', 'sha256:124377c94c7f682b27a7db4ebb16ed731454066605190fe4a6d361e1a9f85892');
