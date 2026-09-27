-- Antrean invalidasi lama masih membawa path /articles (indeks yang sudah dihapus):
-- buang entri itu dari task pending agar purge/revalidate hanya menyentuh route aktif.
-- Idempoten: hanya baris yang masih mengandung pola lama.
UPDATE public.invalidation_tasks
SET paths = array_remove(paths, '/articles'),
    urls = (SELECT coalesce(array_agg(u ORDER BY u), '{}') FROM unnest(urls) AS u WHERE u NOT LIKE '%/articles'),
    updated_at = now()
WHERE status = 'pending'
  AND (paths @> ARRAY['/articles'] OR EXISTS (SELECT 1 FROM unnest(urls) AS u WHERE u LIKE '%/articles'));--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (115, 'invalidation_drop_articles_path', 'sha256:fd4b045ea1ac8db2a78e7fde60139ab96529a146a4ea3a335653613744de86d5');
