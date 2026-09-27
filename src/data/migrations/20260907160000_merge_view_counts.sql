-- F93: gabung counter views menjadi satu kolom.
--
-- custom_view_count tidak pernah dipakai produksi (fitur belum rilis, nol baris
-- berisi nilai): hapus, view_count menjadi satu-satunya angka absolut.
-- Real (flush) menambah; edit manual menimpa absolut.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.article_sites DROP COLUMN IF EXISTS custom_view_count;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (93, 'merge_view_counts', 'sha256:ba58c7da71036cd44d72e10021c6c7ba1ace540f25f95fe3bc42c41db40a7ce3');
