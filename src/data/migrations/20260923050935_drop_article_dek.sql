-- Hapus kolom dek (subheadline) dari articles dan article_revisions.
--
-- Deskripsi tunggal (excerpt) kini mengisi slot bawah judul, listing, dan SEO;
-- kolom dek selalu NULL di seluruh baris sehingga DROP aman tanpa backfill.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.articles DROP COLUMN dek;--> statement-breakpoint
ALTER TABLE public.article_revisions DROP COLUMN dek;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (158, 'drop_article_dek', 'sha256:b8533345456d584baff327174b22be91e8850c48c02a0df6688057975d34a981');
