-- F91: page views per situs (real + custom).
--
-- view_count: total real teragregat dari Redis (ditulis worker flush).
-- custom_view_count: angka dasar manual dari dasbor (ditampilkan + real).
-- Tampil = custom_view_count + view_count.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.article_sites
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  ADD COLUMN IF NOT EXISTS custom_view_count integer NOT NULL DEFAULT 0 CHECK (custom_view_count >= 0);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (91, 'article_site_view_counts', 'sha256:ea741341b4d12e681ccd26a99ac5a904793b22ab73a5150211a39666acaab412');
