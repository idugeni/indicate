-- F93: gabung counter views menjadi satu kolom.
--
-- custom_view_count tidak pernah dipakai produksi (fitur belum rilis, nol baris
-- berisi nilai): hapus, view_count menjadi satu-satunya angka absolut.
-- Real (flush) menambah; edit manual menimpa absolut.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.article_sites DROP COLUMN IF EXISTS custom_view_count;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (93, 'merge_view_counts', 'sha256:f39d872a28b766d00cd24954bbd1926d23b95bfb8c3c3642b5726741a32c1af6');
