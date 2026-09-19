INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('clean-blue', 'Clean Blue Editorial', 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.', 'news'),
  ('black-lime', 'Black Lime Pulse', 'Dark pekat aksen lime: hero split, ticker pil, kartu 4 kolom, panel paling dibaca.', 'news'),
  ('dark-navy', 'Dark Navy Modern', 'Navy gelap modern: hero overlay, list horizontal, panel paling dibaca dan newsletter.', 'news'),
  ('glassy-blue', 'Glassy Blue', 'Kaca biru terang: hero kartu kaca, pil kategori, kartu 3 kolom dan perspektif.', 'news'),
  ('green-minimal', 'Green Minimal', 'Hijau minimal natural: hero split, list editorial, newsletter daun.', 'news'),
  ('orange-modern', 'Orange Modern', 'Oranye modern: hero split kanan, kartu 4 kolom, panel perspektif senja.', 'news'),
  ('purple-editorial', 'Purple Digital Editorial', 'Ungu digital: hero kartu bulat, pil pastel, quote gradien dan newsletter.', 'editorial'),
  ('red-editorial', 'Red Editorial', 'Merah editorial serif: hero split klasik, daftar bernomor, panel marun.', 'editorial'),
  ('soft-blue', 'Soft Blue Cards', 'Kartu biru lembut: hero kartu putih, kartu horizontal 2 kolom, newsletter pos.', 'news'),
  ('warm-editorial', 'Warm Editorial', 'Terakota hangat serif: hero split krem, kartu 3 kolom, quote senja.', 'editorial')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = now();--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (132, 'template_presets_nine', 'sha256:0d9d950fcfb63f2c576bcd0a081e3001b7e71fb63aa2c70e599e103ecea12116');
