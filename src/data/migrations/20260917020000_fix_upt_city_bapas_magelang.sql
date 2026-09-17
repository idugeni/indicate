-- Koreksi kota Bapas Magelang yang janggal di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Bapas Magelang beralamat di Kabupaten Magelang, Kec. Mertoyudan
-- (bukan Kota Magelang).
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Magelang"'), updated_at = now()
WHERE slug = 'bapas-kelas-ii-magelang'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Magelang';--> statement-breakpoint
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Magelang"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'bapas-kelas-ii-magelang'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Magelang';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (122, 'fix_upt_city_bapas_magelang', 'sha256:4d446d44c6de7e3a6c96c6a6d1a31bf2e6d158da3ff3e0af8c5b58d2db698a6d');
