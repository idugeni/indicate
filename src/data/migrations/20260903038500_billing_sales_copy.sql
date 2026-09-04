-- F2-DB: selaraskan teks service_tiers dengan copy penjualan baru.
--
-- Bahasa teknis (domain/API/onboarding) diganti bahasa pembeli. Harga dan
-- kuota tidak berubah — hanya kata-kata.

UPDATE public.service_tiers SET target = 'Punya portal berita sendiri mulai hari ini', summary = 'Terima beres: website berita profesional yang langsung bisa dipakai menulis dan terbit.', features = '["5 website berita siap tayang", "Desain cantik tinggal pilih", "Domain, hosting, dan keamanan kami yang urus", "Bantuan ramah lewat email"]', cta = 'Mulai Sekarang', updated_at = now() WHERE slug = 'starter';--> statement-breakpoint
UPDATE public.service_tiers SET target = 'Satu redaksi untuk banyak portal daerah', summary = 'Tulis satu kali, berita Anda tayang di semua portal sekaligus.', features = '["20 website berita siap tayang", "Terbit sekali, tayang di mana-mana", "Kelola dari HP, kerja dari mana saja", "Bantuan prioritas yang cepat tanggap"]', cta = 'Mulai Sekarang', updated_at = now() WHERE slug = 'growth';--> statement-breakpoint
UPDATE public.service_tiers SET target = 'Untuk grup media yang serius bertumbuh', summary = 'Kapasitas besar plus tim kami dampingi sampai benar-benar jalan.', features = '["100 website berita siap tayang", "Ajak rekan redaksi bergabung (10 orang)", "Pindahan dari sistem lama kami bantu", "Didampingi sampai jalan"]', cta = 'Ambil yang Pro', updated_at = now() WHERE slug = 'pro';--> statement-breakpoint
UPDATE public.service_tiers SET target = 'Ada kebutuhan khusus? Mari duduk bersama', summary = 'Ceritakan kebutuhan Anda, kami rancangkan solusinya.', features = '["Jumlah website mengikuti kebutuhan", "Pindahan data massal kami yang kerjakan", "Kontak khusus yang siap dihubungi", "Didampingi sampai jalan"]', cta = 'Hubungi Tim Penjualan', updated_at = now() WHERE slug = 'enterprise';--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (55, 'billing_sales_copy', 'sha256:e204f388be8bff97fea75619f7a981f3768652dba94f37a3324fbad2b1378d79');
