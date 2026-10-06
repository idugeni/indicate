-- Hapus index GIN duplikat dari migrasi lintas-org.
--
-- `20261006060000_cross_org_articles.sql` membuat `articles_cross_org_tags_gin`
-- tanpa menyadari `articles_tags_gin_idx` sudah ada sejak
-- `20260907150000_article_tags.sql` (advisor `duplicate_index`). Kedua index
-- menutup kolom dan metode yang sama persis, sehingga yang baru hanya
-- membebani tulis tanpa menambah jalur baca. Pertahankan yang lama.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DROP INDEX IF EXISTS public.articles_cross_org_tags_gin;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (273, 'cross_org_tags_gin_dedup', 'sha256:3e9ca75700cd9bb2d59fe977616833abf9de166696dc419adb5ee4effb936bb9');
