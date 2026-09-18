-- FAQ kanonis 13 butir: satu sumber kebenaran untuk jawaban publik.
--
-- Menggantikan pasangan 57 (billing_buyer_faqs, era paket: order, 30 hari,
-- tenggang 7 hari, Starter Rp149rb) + 98 (faq_manual_activation_copy,
-- UPDATE ... WHERE id acak sehingga no-op pada database baru) dengan
-- DELETE + INSERT idempoten ber-UUID tetap. Isi = redaksi aktivasi manual
-- (tanpa paket, tanpa masa tenggang) + butir ke-13 pelaporan konten
-- (/report, tinjau 1x24 jam) yang sinkron dengan Terms §14.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DELETE FROM public.faqs;--> statement-breakpoint
INSERT INTO public.faqs (id, question, answer, sort_order, active) VALUES
  ('dfd974ec-3490-4345-9201-cc46f5e78302', 'Apakah saya membutuhkan server terpisah untuk setiap portal berita?', 'Tidak. Seluruh portal Anda berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tampilan dilakukan otomatis berdasarkan nama domain, jadi nambah portal tidak nambah urusan server.', 1, true),
  ('b1f479b0-a5db-4ba7-a335-62dff874b389', 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?', 'Cukup buka dasbor dari HP atau kirim via chat Telegram yang sudah didaftarkan. Tidak perlu laptop, tidak perlu datang ke kantor.', 2, true),
  ('64258005-e08f-4d51-af15-82703f9832f4', 'Apakah satu artikel bisa tayang di lebih dari satu situs sekaligus?', 'Ya. Tulis satu kali, pilih situs-situs tujuannya, lalu terbitkan. Status tiap penayangan terpantau satu per satu.', 3, true),
  ('63f24875-3436-4a7f-b730-4441c0106a1c', 'Bagaimana cara mulai berlangganan?', 'Hubungi kami lewat WhatsApp atau surel, ceritakan kebutuhan Anda, sepakati biayanya, lalu lakukan pembayaran manual. Setelah terkonfirmasi, organisasi Anda kami aktifkan paling lambat 1x24 jam dan berjalan terus.', 4, true),
  ('2a0f30ac-20aa-4971-9502-944c35c1c705', 'Apakah langganan bisa kedaluwarsa?', 'Tidak ada masa aktif yang kedaluwarsa dan tidak ada masa tenggang: selama status organisasi Anda aktif, seluruh fungsi berjalan penuh. Penonaktifan hanya terjadi atas permintaan Anda atau pelanggaran ketentuan.', 5, true),
  ('dc114ddc-b39c-4691-920c-4f9448aff113', 'Apakah nama domain tetap milik saya?', 'Ya, 100%. Domain dibeli dan dipegang atas nama Anda. Berhenti kapan pun, domain dan seluruh konten dibawa pergi.', 6, true),
  ('64c110a9-da4b-4e9f-9be8-1190096ad96a', 'Apakah ada tingkatan paket?', 'Tidak ada. Semua pelanggan mendapat fungsi yang sama; yang membedakan hanya kebutuhan Anda yang kami diskusikan di awal. Satu-satunya hal yang disesuaikan adalah biaya kesepakatan.', 7, true),
  ('761e83a9-b50d-4766-81c9-efd5652642cd', 'Berapa biayanya?', 'Hubungi kami lewat WhatsApp, ceritakan kebutuhan dan jumlah websitenya. Kami memberi angka pasti di depan sebelum Anda membayar apa pun.', 8, true),
  ('b1d4b620-5724-40d5-8b29-ee1654d23f47', 'Apakah data redaksi saya tercampur dengan pelanggan lain?', 'Data setiap organisasi dipisahkan secara berlapis sampai tingkat basis data dan dirancang agar tidak dapat diakses lintas tenant. Detail penegakannya dijelaskan pada Kebijakan Privasi.', 9, true),
  ('1de04400-5846-4d71-a6e4-b66668c3fc76', 'Saya sudah punya website berjalan. Bisa pindah?', 'Bisa. Ceritakan sistem lama Anda saat menghubungi kami; bantuan pindahan kami sesuaikan dengan kebutuhan.', 10, true),
  ('acd28953-8f62-42a8-9e11-9916dd86b793', 'Apakah ada masa percobaan gratis?', 'Tidak ada trial otomatis. Sebagai gantinya Anda bisa melihat cara kerja dasbor lewat sesi peninjauan bersama sebelum memutuskan.', 11, true),
  ('d849d3fe-c818-469d-bc54-10aa1b8dd235', 'Bagaimana kalau butuh bantuan?', 'Semua pelanggan didampingi manusia lewat kanal yang jelas — bukan bot. Prioritas penanganan mengikuti dampak: situs tidak bisa diakses ditangani lebih dulu.', 12, true),
  ('7e9f1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b', 'Bagaimana cara melaporkan konten yang melanggar?', 'Buka halaman Laporkan Konten (/report) pada portal yang bersangkutan, pilih kategorinya, dan uraikan bagian yang melanggar. Laporan kredibel ditinjau paling lambat 1x24 jam; materi yang disengketakan dapat dibatasi tayangnya selama pemeriksaan.', 13, true);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (124, 'faq_canonical_13', 'sha256:45b7a6df70bf29dabe7ce021357fe4bcce6a60351c74035d46f3d9a1b216cab8');
--> statement-breakpoint
