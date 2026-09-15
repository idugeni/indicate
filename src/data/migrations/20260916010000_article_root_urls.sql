-- Artikel tenant pindah ke slug root: tulis ulang published_url tersimpan
-- dari /articles/<slug> menjadi /<slug>. Idempoten: hanya baris yang masih
-- berawalan pola lama; URL baru (hasil redirect 308 proxy) tidak tersentuh.
UPDATE public.article_sites
SET published_url = regexp_replace(published_url, '/articles/', '/'), updated_at = now()
WHERE published_url LIKE '%/articles/%';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (114, 'article_root_urls', 'sha256:6d4cca5d246408de829601ba01845d3c4ce801c4b05b8a7d4e22d37a817eeb4e');
