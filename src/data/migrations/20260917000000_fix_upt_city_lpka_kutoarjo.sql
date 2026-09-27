-- Koreksi kota LPKA Kutoarjo yang generik di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- LPKA Kutoarjo beralamat di Kabupaten Purworejo (bukan "Jawa Tengah").
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Purworejo"'), updated_at = now()
WHERE slug = 'lpka-kelas-i-kutoarjo'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Jawa Tengah';--> statement-breakpoint
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Purworejo"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lpka-kelas-i-kutoarjo'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Jawa Tengah';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (120, 'fix_upt_city_lpka_kutoarjo', 'sha256:163485bfa218958d2ffa720ee345c2977c21be6daafda65c372fc75de306814f');
