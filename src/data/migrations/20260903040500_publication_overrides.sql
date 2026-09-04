-- Diferensiasi per-target: override judul/deskripsi/gambar per publikasi.
--
-- Satu artikel tayang identik di banyak publisher akan saling menekan di hasil
-- pencarian. Kolom nullable ini memungkinkan tiap target memiliki varian
-- judul, deskripsi, dan gambar sendiri; NULL berarti memakai kanonis artikel.

ALTER TABLE public.article_sites ADD COLUMN custom_title text;--> statement-breakpoint
ALTER TABLE public.article_sites ADD COLUMN custom_description text;--> statement-breakpoint
ALTER TABLE public.article_sites ADD COLUMN custom_image_media_id uuid;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (59, 'publication_overrides', 'sha256:c50be8fe5e4fb80ea33ba68fec8f99ed33492128d5dec79633d9bb341a593292');
