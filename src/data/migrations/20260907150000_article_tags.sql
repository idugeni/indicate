-- F92: tags artikel untuk arsip topik.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[];--> statement-breakpoint
CREATE INDEX IF NOT EXISTS articles_tags_gin_idx ON public.articles USING gin (tags);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (92, 'article_tags', 'sha256:9bceec37ddec044e6961419fffa37def005d45e6fff5f762a8c9130a8284903d');
