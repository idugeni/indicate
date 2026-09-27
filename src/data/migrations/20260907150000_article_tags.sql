-- F92: tags artikel untuk arsip topik.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[];--> statement-breakpoint
CREATE INDEX IF NOT EXISTS articles_tags_gin_idx ON public.articles USING gin (tags);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (92, 'article_tags', 'sha256:150027a34dc697d78713c819653c6d0ed51779d5eb84eb3bebffb8e5e5791961');
