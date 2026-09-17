-- Koreksi kota dua UPT yang generik di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Lapas Pemuda Plantungan beralamat di Kabupaten Kendal;
-- Rutan Banjarnegara beralamat di Kabupaten Banjarnegara.
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Kendal"'), updated_at = now()
WHERE slug = 'lapas-pemuda-kelas-ii-b-plantungan'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Jawa Tengah';--> statement-breakpoint
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Kendal"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lapas-pemuda-kelas-ii-b-plantungan'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Jawa Tengah';--> statement-breakpoint
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Banjarnegara"'), updated_at = now()
WHERE slug = 'rutan-kelas-ii-b-banjarnegara'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Jawa Tengah';--> statement-breakpoint
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Banjarnegara"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'rutan-kelas-ii-b-banjarnegara'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Jawa Tengah';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (121, 'fix_upt_city_plantungan_banjarnegara', 'sha256:49ed7408668f315049085976fc1544f7a76f2174694a0456e1cb59bae198a364');
