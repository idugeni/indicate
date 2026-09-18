-- Label atribusi pendek gaya pers: buang kelas ("Kelas II B") dari semua
-- attribution_label ("Humas Rutan Kelas II B Wonosobo" -> "Humas Rutan Wonosobo").
-- Kolom `name` tetap nama resmi kapital; label "Redaksi ..." tanpa kelas tak tersentuh.
-- Kelas tanpa sub-huruf ("Kelas I Semarang", "Kelas II Klaten") ikut terpangkas;
-- lookahead (?=\s) mencegah huruf awal kota termakan ("I S..." dan "II K..."
-- bukan sub-kelas "II B").
-- Pernyataan kedua membangun ulang label yang sempat terpangkas berlebih oleh
-- revisi regex sebelumnya (huruf awal kota hilang, mis. "LPKAutoarjo",
-- "Bapaslaten") langsung dari `name` resmi yang tak tersentuh.
-- Idempoten: hanya baris yang berubah. Checksum di bawah adalah sha256 heks
-- dari isi berkas ini sebelum baris INSERT.
UPDATE public.publishers
SET attribution_label = regexp_replace(attribution_label, '\sKelas\s+[IVX]+(\s+[A-Z](?=\s))?', '', 'g'),
    updated_at = now()
WHERE attribution_label IS DISTINCT FROM regexp_replace(attribution_label, '\sKelas\s+[IVX]+(\s+[A-Z](?=\s))?', '', 'g');--> statement-breakpoint
UPDATE public.publishers
SET attribution_label =
  'Humas '
  || replace(initcap(split_part(name, ' KELAS', 1)), 'Lpka', 'LPKA')
  || ' '
  || replace(initcap(regexp_replace(name, '^.* KELAS (I|II) ', '')), 'Lpka', 'LPKA'),
    updated_at = now()
WHERE name ~ ' KELAS (I|II) '
  AND name !~ ' KELAS (I|II) [A-Z] '
  AND attribution_label NOT LIKE '% Kelas%'
  AND attribution_label IS DISTINCT FROM
    'Humas '
    || replace(initcap(split_part(name, ' KELAS', 1)), 'Lpka', 'LPKA')
    || ' '
    || replace(initcap(regexp_replace(name, '^.* KELAS (I|II) ', '')), 'Lpka', 'LPKA');--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (126, 'publisher_attribution_short', 'sha256:dc991100643411a0d1ae3d1cab6f6d9c0a646214e9c00c3622303b2cea64d523');
