-- Artikel tenant pindah ke slug root: tulis ulang published_url tersimpan
-- dari /articles/<slug> menjadi /<slug>. Idempoten: hanya baris yang masih
-- berawalan pola lama; URL baru (hasil redirect 308 proxy) tidak tersentuh.
UPDATE public.article_sites
SET published_url = regexp_replace(published_url, '/articles/', '/'), updated_at = now()
WHERE published_url LIKE '%/articles/%';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (114, 'article_root_urls', 'sha256:b3171d2459e0eba194626be04667da52fa8f91e8f3512fe1914fd0cf915a8ba1');
