-- Kanal kontak kini membawa tautan (href) + salinan baru berisi alamat asli.
--
-- Menambah kolom href nullable, menambah baris WhatsApp, dan menyelaraskan
-- judul/deskripsi/urutan dengan fallback kode supaya DB dan kode sejalan.

ALTER TABLE public.contact_channels ADD COLUMN href text;--> statement-breakpoint
INSERT INTO public.contact_channels (key, title, description, href, sort_order) VALUES
  ('email', 'Surel', 'officialelsa21@gmail.com — kirim kebutuhan Anda beserta jumlah domain dan wilayah yang direncanakan.', 'mailto:officialelsa21@gmail.com', 1),
  ('whatsapp', 'WhatsApp', '0856-4115-9405 — jalur tercepat untuk paket Enterprise, pindahan sistem, atau pertanyaan harga.', 'https://wa.me/6285641159405?text=Halo%20Indicate%2C%20saya%20ingin%20bertanya.', 2),
  ('telegram', 'Telegram', '@eliyantosarage — tanya jawab singkat mengenai alur redaksi dan integrasi bot.', 'https://t.me/eliyantosarage', 3),
  ('visit', 'Peninjauan bersama', 'Sesi daring untuk menelusuri dasbor dan alur penerbitan — jadwalkan lewat WhatsApp atau surel.', NULL, 4)
ON CONFLICT (key) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, href = EXCLUDED.href, sort_order = EXCLUDED.sort_order;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (58, 'contact_channel_hrefs', 'sha256:f5bafeff83d231cc767e3bf62ce588ba523fd6decb51adb69bb010c42965a833');
