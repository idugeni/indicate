-- F2-DB: FAQ menjadi 12 butir jawaban pembeli.
--
-- Mengganti 4 FAQ teknis lama dengan 12 FAQ seputar beli, bayar, tenggang,
-- domain, pindah sistem, dan bantuan — cermin fallback kode.

DELETE FROM public.faqs;--> statement-breakpoint
INSERT INTO public.faqs (id, question, answer, sort_order, active) VALUES
  (gen_random_uuid(), 'Apakah saya membutuhkan server terpisah untuk setiap portal berita?', 'Tidak. Seluruh portal Anda berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tampilan dilakukan otomatis berdasarkan nama domain, jadi nambah portal tidak nambah urusan server.', 1, true),
  (gen_random_uuid(), 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?', 'Cukup buka dasbor dari HP atau kirim via chat Telegram yang sudah didaftarkan. Tidak perlu laptop, tidak perlu datang ke kantor.', 2, true),
  (gen_random_uuid(), 'Apakah satu artikel bisa tayang di lebih dari satu situs sekaligus?', 'Ya. Tulis satu kali, pilih situs-situs tujuannya, lalu terbitkan. Status tiap penayangan terpantau satu per satu.', 3, true),
  (gen_random_uuid(), 'Bagaimana cara mulai berlangganan?', 'Daftar akun, pilih paket, buat order, bayar, lalu unggah bukti bayarnya. Tim kami memverifikasi paling lambat 1x24 jam, setelah itu langganan aktif 30 hari.', 4, true),
  (gen_random_uuid(), 'Apa yang terjadi kalau masa aktif habis?', 'Anda mendapat masa tenggang baca 7 hari — data aman dan masih bisa dilihat. Perpanjang kapan saja untuk kembali menulis dan menerbitkan seperti biasa.', 5, true),
  (gen_random_uuid(), 'Apakah nama domain tetap milik saya?', 'Ya, 100%. Domain dibeli dan dipegang atas nama Anda. Berhenti kapan pun, domain dan seluruh konten dibawa pergi.', 6, true),
  (gen_random_uuid(), 'Bisakah naik atau turun paket di tengah jalan?', 'Bisa. Buat order paket baru dari halaman Langganan; setelah diverifikasi, paket langsung berganti dan masa aktif dihitung ulang 30 hari.', 7, true),
  (gen_random_uuid(), 'Bagaimana paket Enterprise bekerja?', 'Hubungi tim penjualan lewat WhatsApp, ceritakan kebutuhan dan jumlah websitenya. Kami susun penawaran yang pas, lalu jadwalkan onboarding dan pindahan data.', 8, true),
  (gen_random_uuid(), 'Apakah data redaksi saya tercampur dengan pelanggan lain?', 'Tidak. Setiap data terikat pada satu organisasi dan pemisahannya ditegakkan sampai lapisan basis data. Pelanggan lain tidak bisa mengintip data Anda lewat domain apa pun.', 9, true),
  (gen_random_uuid(), 'Saya sudah punya website berjalan. Bisa pindah?', 'Bisa. Paket Pro ke atas mencakup bantuan pindahan, dan paket Enterprise mencakup pindahan data massal yang kami kerjakan. Ceritakan sistem lama Anda saat mendaftar.', 10, true),
  (gen_random_uuid(), 'Apakah ada masa percobaan gratis?', 'Tidak ada trial otomatis, tapi Anda bisa melihat semua paket beserta batasnya secara terbuka sebelum membayar. Paket Starter mulai Rp149rb per bulan.', 11, true),
  (gen_random_uuid(), 'Bagaimana kalau butuh bantuan?', 'Paket Starter dan Growth dilayani lewat email dan prioritas; paket Pro didampingi sampai jalan; Enterprise punya kontak khusus. Semua paket dijawab manusia, bukan bot.', 12, true);--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (57, 'billing_buyer_faqs', 'sha256:695776f7a12fd19915a298e1273f22ae09adf1c58866a5a7b37552b8969f70bf');
