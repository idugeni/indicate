# Adendum Pemrosesan Data (DPA)

**Status:** dilengkapi dan ditandatangani bersama SOW untuk paket Enterprise.
**Dasar:** UU PDP No. 27/2022; Ketentuan Layanan (`/terms` §19) dan Kebijakan Privasi (`/privacy` §11–§12).

## 1. Para pihak dan peran

- **Pengendali:** Pelanggan (organisasi) untuk Konten Pelanggan dan data pribadi pihak ketiga di dalamnya.
- **Pemroses:** PT SANCA PHENA CAKRA ("Penyelenggara Indicate"), berdomisili di
  Jl. Raya Kalierang Gg. Melati RT 001/RW 005, Kalierang, Selomerto,
  Kabupaten Wonosobo, Jawa Tengah 56361, NPWP 1000000011023036,
  surel sancaphenacakra@gmail.com, telepon 0856-4115-9405 — untuk pemrosesan
  atas instruksi Pengendali demi penyediaan Layanan.
- Untuk data akun/penagihan/operasional Layanan, Penyelenggara bertindak sebagai Pengendali tersendiri (lihat Kebijakan Privasi §1).

## 2. Ruang lingkup dan durasi

Pemrosesan mencakup hosting situs berita, redaksi terpusat, penerbitan multi-situs,
penyimpanan media privat, penagihan manual, dan dukungan — selama Kontrak berlaku
ditambah masa retensi pada Kebijakan Privasi §13 (operasional ≤90 hari pasca-terminasi,
arsip transaksi 10 tahun, jejak audit 5 tahun, log teknis 30–90 hari).

## 3. Kewajiban Pemroses

1. Memproses data hanya atas instruksi tertulis Pengendali (Kontrak ini + tiket dukungan resmi).
2. Menegakkan pemisahan tenant berlapis (exact-host, `organizationId` tunggal per operasi, RLS
   `indicate_runtime` tanpa `BYPASSRLS`, namespace cache dan otorisasi media per-host).
3. Enkripsi saat transit (TLS) dan saat tersimpan; rahasia hanya di penyimpanan sisi server;
   tautan media bertanda tangan berumur pendek; tidak ada bucket publik.
4. Jejak audit hanya-tambah berantai hash (HMAC, stempel jam database, verifikasi malam hari).
5. Membantu pemenuhan hak subjek data (tiket DSAR bernomor, SLA 3/30 hari) dan penilaian
   dampak transfer lintas negara bila relevan.
6. Memberitahu Pengendali tanpa penundaan yang tidak wajar bila terjadi pelanggaran
   pelindungan data yang berisiko terhadap hak subjek data.
7. Menghapus atau mengembalikan data setelah terminasi sesuai jadwal retensi, kecuali
   penyimpanan yang diwajibkan hukum (dengan dasar yang dijelaskan).

## 4. Subprosesor

Kategori saat ini (nama dagang dan lokasi terkini tersedia atas permintaan via kontak privasi;
perubahan material diberitahukan ≥14 hari sebelumnya):

| Kategori | Peran | Data minimum |
|---|---|---|
| Basis data terkelola + autentikasi | Akun, konten, konfigurasi, sesi | Perlu untuk fungsi |
| Penyimpanan objek privat | Berkas media | Perlu untuk fungsi |
| Antrean/cache | Penjadwalan, batas laju, invalidasi | Operasional, bukan catatan utama |
| Jaringan tepi + DNS | Hantaran halaman publik via TLS | Salinan cache konten publik |
| Hosting aplikasi | Eksekusi kode Layanan | Perlu untuk fungsi |
| Surel transaksional | Notifikasi penagihan/keamanan | Alamat + isi notifikasi |

Pemroses mengikat setiap subprosesor pada kewajiban kerahasiaan dan keamanan yang setara
dan tetap bertanggung jawab penuh atas kelalaiannya.

## 5. Audit dan kepatuhan

Pengendali Enterprise berhak meminta ringkasan bukti Applicable: catatan rantai audit,
baris `retention_runs`, dan laporan verifikasi malam hari — paling banyak satu kali per
tahun kalender tanpa biaya, atau sewaktu-waktu bila terjadi insiden. Audit lapangan
diatur dalam SOW.

## 6. Tanggung jawab

Batasan tanggung jawab mengikuti Kontrak §20. Pelanggaran kewajiban DPA ini diperlakukan
sebagai pelanggaran Kontrak.

## 7. Tanda tangan

| | Pemroses | Pengendali |
|---|---|---|
| Nama jelas | PT SANCA PHENA CAKRA | (nama organisasi) |
| Jabatan penandatangan | | |
| Tanggal | | |
| Tanda tangan + stempel | | |

Kontak privasi Pemroses: sancaphenacakra@gmail.com (lihat Kebijakan Privasi §20
untuk jalur pengaduan ke otoritas).

---
*Template v2026-09-07. Domisili data khusus dan klausul transfer lintas negara disepakati
dalam SOW sepanjang didukung penyedia infrastruktur.*
