-- Sumber tunggal aturan label atribusi pendek untuk seed batch berikutnya
-- ("RUTAN KELAS II B WONOSOBO" -> "Humas Rutan Wonosobo").
-- Form dashboard memakai padanan TypeScript-nya
-- (modules/dashboard/components/editorial/publisher-attribution.ts); ubah
-- keduanya bila aturan berubah. Idempoten (CREATE OR REPLACE).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.short_attribution_label(official_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
RETURN 'Humas ' || replace(initcap(regexp_replace(official_name, '\sKELAS\s+[IVX]+(\s+[A-Z](?=\s))?', '', 'g')), 'Lpka', 'LPKA');--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.short_attribution_label(text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (127, 'publisher_attribution_helper', 'sha256:97f0c9c59803a4620ab07b584eb39870f7ea45f1894d2ee97db03f9fe45be4bb');
