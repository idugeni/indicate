-- Atribusi display gaya pers: prefix "Humas " + nama Title Case
-- ("Humas Lapas Kelas I Semarang"). Kolom `name` tetap nama resmi kapital.
-- Akronim dijaga (LPKA tetap kapital). Idempoten: hanya baris yang berbeda.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.publishers p
SET attribution_label = v.attribution, updated_at = now()
FROM public.organizations o
JOIN (VALUES
  ('lapas-kelas-i-batu-nusakambangan', 'Humas Lapas Kelas I Batu Nusakambangan'),
  ('lapas-kelas-i-semarang', 'Humas Lapas Kelas I Semarang'),
  ('lapas-kelas-ii-a-ambarawa', 'Humas Lapas Kelas II A Ambarawa'),
  ('lapas-kelas-ii-a-besi-nusakambangan', 'Humas Lapas Kelas II A Besi Nusakambangan'),
  ('lapas-khusus-kelas-ii-a-karanganyar-nusakambangan', 'Humas Lapas Khusus Kelas II A Karanganyar Nusakambangan'),
  ('lapas-kelas-ii-a-kembang-kuning-nusakambangan', 'Humas Lapas Kelas II A Kembang Kuning Nusakambangan'),
  ('lapas-kelas-ii-a-gladakan-nusakambangan', 'Humas Lapas Kelas II A Gladakan Nusakambangan'),
  ('lapas-kelas-ii-a-kumbang-nusakambangan', 'Humas Lapas Kelas II A Kumbang Nusakambangan'),
  ('lapas-kelas-ii-a-ngaseman-nusakambangan', 'Humas Lapas Kelas II A Ngaseman Nusakambangan'),
  ('lapas-kelas-ii-a-kendal', 'Humas Lapas Kelas II A Kendal'),
  ('lapas-kelas-ii-a-magelang', 'Humas Lapas Kelas II A Magelang'),
  ('lapas-narkotika-kelas-ii-a-nusakambangan', 'Humas Lapas Narkotika Kelas II A Nusakambangan'),
  ('lapas-narkotika-kelas-ii-b-purwokerto', 'Humas Lapas Narkotika Kelas II B Purwokerto'),
  ('lapas-kelas-ii-a-pasir-putih-nusakambangan', 'Humas Lapas Kelas II A Pasir Putih Nusakambangan'),
  ('lapas-kelas-ii-a-pekalongan', 'Humas Lapas Kelas II A Pekalongan'),
  ('lapas-perempuan-kelas-ii-a-semarang', 'Humas Lapas Perempuan Kelas II A Semarang'),
  ('lapas-kelas-ii-a-permisan-nusakambangan', 'Humas Lapas Kelas II A Permisan Nusakambangan'),
  ('lapas-kelas-ii-a-purwokerto', 'Humas Lapas Kelas II A Purwokerto'),
  ('lapas-kelas-ii-a-sragen', 'Humas Lapas Kelas II A Sragen'),
  ('lapas-kelas-ii-b-nirbaya-nusakambangan', 'Humas Lapas Kelas II B Nirbaya Nusakambangan'),
  ('lapas-kelas-ii-b-batang', 'Humas Lapas Kelas II B Batang'),
  ('lapas-kelas-ii-b-brebes', 'Humas Lapas Kelas II B Brebes'),
  ('lapas-kelas-ii-b-cilacap', 'Humas Lapas Kelas II B Cilacap'),
  ('lapas-kelas-ii-b-klaten', 'Humas Lapas Kelas II B Klaten'),
  ('lapas-kelas-ii-b-pati', 'Humas Lapas Kelas II B Pati'),
  ('lapas-kelas-ii-b-purwodadi', 'Humas Lapas Kelas II B Purwodadi'),
  ('lapas-kelas-ii-b-slawi', 'Humas Lapas Kelas II B Slawi'),
  ('lapas-kelas-ii-b-tegal', 'Humas Lapas Kelas II B Tegal'),
  ('lapas-kelas-ii-b-wonogiri', 'Humas Lapas Kelas II B Wonogiri'),
  ('lapas-pemuda-kelas-ii-b-plantungan', 'Humas Lapas Pemuda Kelas II B Plantungan'),
  ('lapas-terbuka-kelas-ii-b-kendal', 'Humas Lapas Terbuka Kelas II B Kendal'),
  ('lapas-terbuka-kelas-ii-b-nusakambangan', 'Humas Lapas Terbuka Kelas II B Nusakambangan'),
  ('lpka-kelas-i-kutoarjo', 'Humas LPKA Kelas I Kutoarjo'),
  ('rutan-kelas-i-semarang', 'Humas Rutan Kelas I Semarang'),
  ('rutan-kelas-i-surakarta', 'Humas Rutan Kelas I Surakarta'),
  ('rutan-kelas-ii-a-pekalongan', 'Humas Rutan Kelas II A Pekalongan'),
  ('rutan-kelas-ii-b-banjarnegara', 'Humas Rutan Kelas II B Banjarnegara'),
  ('rutan-kelas-ii-b-banyumas', 'Humas Rutan Kelas II B Banyumas'),
  ('rutan-kelas-ii-b-blora', 'Humas Rutan Kelas II B Blora'),
  ('rutan-kelas-ii-b-boyolali', 'Humas Rutan Kelas II B Boyolali'),
  ('rutan-kelas-ii-b-demak', 'Humas Rutan Kelas II B Demak'),
  ('rutan-kelas-ii-b-jepara', 'Humas Rutan Kelas II B Jepara'),
  ('rutan-kelas-ii-b-kebumen', 'Humas Rutan Kelas II B Kebumen'),
  ('rutan-kelas-ii-b-kudus', 'Humas Rutan Kelas II B Kudus'),
  ('rutan-kelas-ii-b-pemalang', 'Humas Rutan Kelas II B Pemalang'),
  ('rutan-kelas-ii-b-purbalingga', 'Humas Rutan Kelas II B Purbalingga'),
  ('rutan-kelas-ii-b-purworejo', 'Humas Rutan Kelas II B Purworejo'),
  ('rutan-kelas-ii-b-rembang', 'Humas Rutan Kelas II B Rembang'),
  ('rutan-kelas-ii-b-salatiga', 'Humas Rutan Kelas II B Salatiga'),
  ('rutan-kelas-ii-b-temanggung', 'Humas Rutan Kelas II B Temanggung'),
  ('rutan-kelas-ii-b-wonosobo', 'Humas Rutan Kelas II B Wonosobo'),
  ('bapas-kelas-i-semarang', 'Humas Bapas Kelas I Semarang'),
  ('bapas-kelas-ii-klaten', 'Humas Bapas Kelas II Klaten'),
  ('bapas-kelas-i-surakarta', 'Humas Bapas Kelas I Surakarta'),
  ('bapas-kelas-ii-nusakambangan', 'Humas Bapas Kelas II Nusakambangan'),
  ('bapas-kelas-ii-pati', 'Humas Bapas Kelas II Pati'),
  ('bapas-kelas-ii-magelang', 'Humas Bapas Kelas II Magelang'),
  ('bapas-kelas-ii-pekalongan', 'Humas Bapas Kelas II Pekalongan'),
  ('bapas-kelas-ii-purwokerto', 'Humas Bapas Kelas II Purwokerto')
) AS v(slug, attribution)
ON o.slug = v.slug
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.attribution_label IS DISTINCT FROM v.attribution;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (96, 'publisher_humas_attribution', 'sha256:ecd976b352f3a12154fabf007232f3848dd5b6e788cba2a9be371cf32701399f');

