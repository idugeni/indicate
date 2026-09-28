# Pelajaran operasional

> **Status:** Living document — ditulis 2026-09-19 dari insiden nyata, perbarui tiap ada insiden baru.
> **Owner:** Platform team.
> **Related:** [migrations](migrations.md) · [active domains](active-domains.md)

## 1. Tulis ke Supabase via MCP: selalu transaksi eksplisit + konteks tenant

RLS dipaksa (`FORCE`) di tabel tenant dan koneksi berjalan lewat pooler
(Supavisor) dengan GUC sisa sesi lain. Akibatnya baca/tulis tanpa konteks
tidak deterministik: baris yang ada bisa terbaca hilang, FK gagal padahal
baris ada.

Pola wajib untuk setiap panggilan tulis (dan baca verifikasi):

```sql
BEGIN;
SET LOCAL app.organization_id='<org-uuid>';
SET LOCAL app.region_id=''; -- NULL untuk apex; isi region untuk regional
SET LOCAL app.actor_id='ops:<nama-batch>';
SET LOCAL app.request_id='<id-unik>';
-- ... kerja ...
COMMIT;
```

`set_tenant_context()` menolak bila sesi membawa org lain (konflik
konteks), jadi `SET LOCAL` langsung lebih aman untuk batch operator.
Satu panggilan `execute_sql` = satu sesi; jangan andalkan status appels
sebelumnya.

## 2. UUID disalin, tidak diketik ulang — lalu uji round-trip

Insiden 2026-09-19: satu karakter salah salin (`8ee4` vs `8eb5`)
menyebabkan puluhan panggilan gagal dan diagnosis liar (korupsi indeks,
pooler, transaksi bocor). Semua runtuh setelah literal dibetulkan.

Aturan: ambil UUID dari output query lewat salin, dan sebelum batch tulis
besar, uji satu `id_match` di SQL (`(id = '<uuid>'::uuid)`) — bukan
dengan mata.

## 3. Urutan diagnosis "baris ada tapi FK gagal"

1. Benarkan literal dulu (uji `id_match`/`org_match` di SQL).
2. Pastikan konteks tenant + transaksi eksplisit (aturan 1).
3. Baru curigai korupsi indeks (`amcheck`) atau transaksi bocor
   (`pg_stat_activity`).

## 4. Checklist brand per site (protokol baku, terbukti 35 site)

Master gradient huruf awal nama portal (tabrakan huruf = bytes sama,
upload terpisah per site). Per site: PUT logo + favicon ke R2
(`sites/{siteId}/{logo|favicon}-{domain-rapi}-{16hex}.png`,
`Content-Type image/png`, checksum SHA256) → verifikasi HEAD (200 +
ukuran + tipe) → dalam satu transaksi DB: reservasi ×2 → media ×2
aktif → reservasi → `used` → settings (+versi, taut media) → task
`media.activated` → audit (2 reserve + 2 activate + 1 settings-update,
aktor `system`, `request_id ops:<batch>`). Bersihkan objek yatim
(data tanpa baris media). Catatan: reservasi baru memakai key tenant-scoped
(`o/{org}/p/...`, artikel ke prefix `pub/`); format `sites/{siteId}/...`
di atas adalah tata letak legacy yang tetap valid.

## 7. Favicon tenant vs Google: robots + stabilitas URL

Insiden: favicon tenant tidak tampil di hasil pencarian (ikon generik).
Dua lapis penyebab, keduanya terverifikasi live:

1. `robots.txt` tenant memuat `Disallow: /api/`, sedangkan URL favicon
   adalah `/api/network/media/{id}` — Googlebot-Image patuh robots lalu
   menyerah. Syarat Google: Googlebot-Image wajib bisa merayapi file ikon.
2. Rute media menjawab 307 ke presigned URL berumur 300 detik yang
   berganti tiap fetch — melanggar syarat "URL favicon harus stabil".

Aturan: aset brand yang pada dasarnya publik (favicon, logo) wajib URL
stabil ber-cache panjang tanpa signature; jangan pernah menaruh URL
bertanda-tangan di `<link rel="icon">`. Dimensi favicon wajib square ≥48px
terverifikasi (kolom `media.width_px/height_px`), bukan asumsi.

## 8. Skop token R2 mengikat per bucket

Kredensial S3 R2 (`R2_ACCESS_KEY_ID`) bisa terkunci ke bucket tertentu.
Adapter memakai SATU kredensial untuk KEDUA bucket media (routing by
prefix `pub/`, health check `HeadBucket` keduanya), jadi setiap bucket
baru (publik/privat) wajib ditambahkan ke skop token SEBELUM flip
config — kalau tidak, upload 403 dan flip merusak serving media.
Pengelolaan skop hanya via dashboard (tidak ada API publik).
Urutannya: tambah skop → salin + verifikasi ETag → flip
`shared_deployment_config` → uji baca-tulis → hapus bucket lama.

## 9. Proteksi branch vs direct push solo

`required_status_checks` pada proteksi branch MENOLAK direct push
("Required status check is expected") — check hanya bisa hijau untuk
merge, urutannya mustahil untuk push. Untuk alur solo push-langsung:
proteksi = tanpa force-push + tanpa hapus branch + enforce admin SAJA;
gate tetap jalan tiap push sebagai penanda. Jangan pasang status-check
wajib kecuali alur pindah ke PR.

## 10. Pagination MCP + klaim versi migrasi lintas sesi

- MCP `cloudflare-api` list R2 me-return 20 objek per halaman TANPA
  cursor terekspos — untuk inventarisasi penuh pakai REST langsung
  dengan cursor, atau `wrangler r2 object get/put/delete` (otentikasi
  `CLOUDFLARE_API_TOKEN` dari `.env`, binary-safe; MCP string body
  merusak biner). Di Windows, spawn `wrangler` butuh `shell: true`.
- Nomor versi ledger (`indicate_schema_migrations.version`) adalah
  sumber daya bersama antar sesi paralel. Sebelum menulis migrasi:
  baca tail `_journal.json` DAN `max(version)` live — tabrakan pernah
  terjadi (v164 ganda) dan hanya ketahuan saat apply.

## 5. Fakta kapasitas (terverifikasi API, bukan asumsi)

Limit domain Vercel adalah Pro unlimited (soft-cap 100 ribu; kuota Hobby 50
sudah ditinggalkan saat upgrade). Setiap apex makan 1 slot exact + 1 slot
wildcard; regional satu-label DB-only tanpa slot. Target CNAME project stabil (`58a0c0dd872d3769.vercel-dns-017.com`,
proxied) dipakai ulang untuk semua zona.

## 6. Ledger md adalah definition-of-done

Setiap perubahan domain/hostname wajib dicatat di
`docs/active-domains.md` (status DB + Vercel + HTTP + kuota) pada giliran
yang sama — bukan belakangan.

## 11. "Corrupted Image" Meta = robots, bukan gambar rusak

Insiden: debugger Facebook melaporkan `og:image ... could not be processed as
an image` untuk `jurnalism.web.id` padahal URL-nya 200 + `image/png`.

Byte PNG-nya terbukti sehat: 71.174 byte, signature `89 50 4e 47`, seluruh
CRC chunk OK, IDAT inflate bersih, 1200x630 RGBA, identik di empat fetch
berturut-turut, tanpa `Content-Encoding` apa pun. Penyebab sebenarnya ada di
robots.txt, bukan di berkas: `Disallow: /api/` menutup
`/api/network/media/{id}` — satu-satunya permukaan gambar yang dilihat
crawler. `facebookexternalhit` menolak fetch, tidak pernah melihat byte, lalu
melaporkannya sebagai gambar rusak.

Verifikasi yang membedakan: unduh byte dan decode (bukan hanya cek magic
byte), lalu `curl` robots.txt dan cari prefiks URL aset. Warm-up internal
memakai fetch biasa sehingga selalu hijau — ia tidak memperlakukan robots.txt,
jadi ia tidak bisa menangkap kelas bug ini.

Aturan: setiap URL yang dialuskan ke crawler (og:image, cover artikel, galeri,
sitemap `image:`) harus lolos robots. Dua jalan, pilih sesuai sifatnya:

- satu slot konfigurasi per site (default OG) → `Allow: /api/network/media/`
  di `serializeRobots`, karena prefiks carve-out lebih panjang dari `/api/`
  sehingga menang lewat longest-match;
- satu aset identik per site (favicon, logo) → pindah ke path stabil di luar
  `/api/` seperti `brand-icons.ts` (lihat pelajaran 7).

Setelah robots berubah, bersihkan cache edge `robots.txt` (`s-maxage=3600`).
Cache scraper ikut kedaluwarsa sendiri sesuai age-nya, jadi tidak ada langkah
pemanasan aplikasi yang perlu dijalankan manual.

## 12. Pre-scrape pihak ketiga: jangan mildewati pipeline sendirian

Dulu ada ledger satu-shot di `article_sites` (`social_warmed_at`, cooldown,
index parsial, tiga helper `SECURITY DEFINER`) plus satu cron
`facebook-prewarm`, semuanya untuk menyerahkan URL ke backend scrape Meta satu
kali seumur hidup artikel. Migrasi 217 menghapus seluruhnya.

Yang terbukti mahal: ledger itu tidak pernah kosong. Per 2026-09-27, 4.020 dari
4.020 baris published masih `social_warmed_at IS NULL`, dan itu bukan karena
Meta menolak — melainkan karena warmer hanya dipasang kalau `FB_APP_TOKEN` ada.
Artinya biaya produksi (dua migrasi, tiga helper, satu cron, tiga kolom,
cooldown berlipat) dibayar penuh untuk fitur yang secara default mati, dan
kegagalannya tidak terlihat karena tidak ada URL yang pernah dicoba.

Aturan: sebelum menambah pemanasan untuk pihak ketiga, hitung dulu biaya
failurnya dan dari mana fitur itu gagal diam-diam. Tanpa kredensial tidak ada
panggilan, dan tanpa panggilan tidak perlu ledger. Yang benar-benar menahan
kartu tetap deliverable: `og:title`/`og:description`/`og:image` yang benar,
robots yang mengizinkan crawler, dan byte gambar yang tersaji dari host sendiri.
Itu platform-independent, tidak bisa dimatikan kuota pihak ketiga, dan tidak
butuh kredensial apa pun.

Kartu yang sudah ter-cache di sisi scraper tidak bisa disegarkan dari dalam
aplikasi; membagikan ulang link adalah satu-satunya obat. Itu konsekuensi yang
disepakati, bukan bug yang menunggu perbaikan.

## 13. Komentar migrasi adalah klaim, bukan catatan

Komentar migration 204 (`audit_chain_head_lock`) menyatakan diagnosis yang
terukur: enam fork, semuanya `media.access.authorize`, antara 16 dan 17
September. `audit_chain_scan()` pada produksi mengembalikan **67 baris rusak**:
1 pada 2026-09-04, **60 pada 2026-09-13**, 3 pada 09-16, 3 pada 09-17. Action
yang rusak sebagian besar `membership.assign-first`, `invite.create`, dan
`organization.transfer` — bukan `media.access.authorize`.

Hanya sebagian yang benar. **Enam** baris memang berbagi `prev_hash` dengan
tetangganya; 61 sisanya punya `prev_hash` unik, jadi mekanismenya berbeda dan
tidak dijelaskan oleh advisory lock. Akar penyebab 61 baris itu belum
dibuktikan. `seq` punya lima celah totaling 964, tetapi `seq` tampaknya identity
column yang nilainya habis dipakai transaksi yang rollback, jadi celah itu belum
tentu berarti baris hilang — klaim itu tidak ditulis tanpa bukti.

Kodenya sendiri benar: lock ada, `FOR UPDATE` hilang, assertion pada `DO` block
lulus, ledger 204/204. Yang keliru hanya cara menguraikan data yang ternyata
ditemukan.

**Aturan:** komentar migrasi yang menyebut jumlah, rentang tanggal, atau
`action` dari data produksi adalah klaim yang harus diverifikasi ke database
sebelum di-commit. Kode yang benar tidak menjamin cerita yang benar. Kalau
sebuah angka muncul di komentar, jalankan query yang menghasilkan angka itu.

**Kenapa koreksinya tidak ditulis di file migrasi.** Dua checksum terpisah
menjepit file itu. `drizzle."__drizzle_migrations".hash` adalah SHA-256 seluruh
byte file termasuk komentar, dihitung `scripts/db-bootstrap.mjs`; dan
`public.indicate_schema_migrations.checksum` adalah checksum swadaya dengan
substitusi 64 nol yang ditulis `INSERT` migrasi itu sendiri. Mengubah komentar
menggerakkan keduanya: bootstrap harus diregenerasi dan baris ledger produksi
harus di-`UPDATE` agar checksum swadaya tetap jujur. Mutasi ledger itu lebih
berbahaya daripada kalimat yang keliru, jadi file yang sudah diterapkan
dibiarkan byte-identik dan koreksinya dicatat di sini serta di pesan commit —
keduanya permanen dan bisa dicari.
