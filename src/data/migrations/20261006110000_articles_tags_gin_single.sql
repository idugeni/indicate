-- Jaga satu index GIN tunggal di articles.tags.
--
-- `20261006090000_cross_org_bridge_urls.sql` membuat ulang
-- `articles_cross_org_tags_gin` yang sudah dibuang
-- `20261006080000_cross_org_tags_gin_dedup.sql` (advisor `duplicate_index`).
-- Idempoten: aman bila duplikatnya belum pernah dibuat ulang.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DROP INDEX IF EXISTS public.articles_cross_org_tags_gin;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (276, 'articles_tags_gin_single', 'sha256:0558eee2d6ca0947d63127d2ee45260599e0fe811d12930dd79f2d9ae0ef4716');
