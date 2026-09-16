-- Profesionalisasi atribusi konten contoh: nama figur publik dan media
-- pajangan diganti identitas netral; kutipan dan FAQ tidak berubah.
-- Idempoten: hanya baris seed yang masih bernama lama.
UPDATE public.testimonials
SET author = 'Bambang Setiawan', role = 'Pemimpin Redaksi', media = 'Grup Media Mitra', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007001' AND author = 'Bambang Suryono';--> statement-breakpoint
UPDATE public.testimonials
SET author = 'Dian Puspita', role = 'Kepala Infrastruktur Digital', media = 'Jaringan Pers Daerah', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007002' AND author = 'Dian Sastrowardoyo';--> statement-breakpoint
UPDATE public.media_showcase
SET name = 'Warta Buana', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007022' AND name = 'Meridian News';--> statement-breakpoint
UPDATE public.media_showcase
SET name = 'Cendekia Post', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007027' AND name = 'Arcadia News';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (117, 'content_attribution_cleanup', 'sha256:bb43add4ffa8c5dd9be068b57293399423a4c32689e77291ae52f7c48b0ec089');
