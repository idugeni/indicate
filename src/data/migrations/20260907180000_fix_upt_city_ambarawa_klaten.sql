-- Koreksi kota dua UPT yang janggal di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Ambarawa berada di Kabupaten Semarang (bukan Kota Semarang);
-- Bapas Klaten beralamat di Kabupaten Klaten (bukan Kota Tegal).
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Semarang"'), updated_at = now()
WHERE slug = 'lapas-kelas-ii-a-ambarawa'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Semarang';--> statement-breakpoint
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Semarang"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lapas-kelas-ii-a-ambarawa'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Semarang';--> statement-breakpoint
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Klaten"'), updated_at = now()
WHERE slug = 'bapas-kelas-ii-klaten'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Tegal';--> statement-breakpoint
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Klaten"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'bapas-kelas-ii-klaten'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Tegal';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (95, 'fix_upt_city_ambarawa_klaten', 'sha256:8c3f2f088d2a32b50be99cfddb9765be28dfd650db1fbc417e00cf3f55f89b62');

