-- Detail lama /articles/<slug> di antrean pending ditulis ulang ke /<slug>:
-- purge/revalidate tetap mengenai halaman asli, bukan URL mati.
-- Idempoten: hanya baris yang masih mengandung pola lama.
UPDATE public.invalidation_tasks
SET paths = (SELECT coalesce(array_agg(regexp_replace(p, '/articles/', '/') ORDER BY p), '{}') FROM unnest(paths) AS p),
    urls = (SELECT coalesce(array_agg(regexp_replace(u, '/articles/', '/') ORDER BY u), '{}') FROM unnest(urls) AS u),
    updated_at = now()
WHERE status = 'pending'
  AND (EXISTS (SELECT 1 FROM unnest(paths) AS p WHERE p LIKE '%/articles/%') OR EXISTS (SELECT 1 FROM unnest(urls) AS u WHERE u LIKE '%/articles/%'));--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (116, 'invalidation_root_article_paths', 'sha256:bab2074239b3ccca3247b72c66e0ed90af9cbf682279bf1fe468cd11e1961bea');
