-- Koreksi kota Lapas Slawi yang janggal di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Lapas Slawi beralamat di Tegalandong, Kabupaten Tegal (bukan Kota Tegal).
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Tegal"'), updated_at = now()
WHERE slug = 'lapas-kelas-ii-b-slawi'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Tegal';--> statement-breakpoint
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Tegal"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lapas-kelas-ii-b-slawi'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Tegal';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (123, 'fix_upt_city_slawi', 'sha256:368630527513803ac6f978f9affac3f6af0a6bfe6207cc84a1c94b7560a1fdc8');
