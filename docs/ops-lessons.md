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
(`social-warm.ts`) memakai fetch biasa sehingga selalu hijau — ia tidak
mempertahankan robots.txt, jadi ia tidak bisa menangkap kelas bug ini.

Aturan: setiap URL yang dialuskan ke crawler (og:image, cover artikel, galeri,
sitemap `image:`) harus lolos robots. Dua jalan, pilih sesuai sifatnya:

- satu slot konfigurasi per site (default OG) → `Allow: /api/network/media/`
  di `serializeRobots`, karena prefiks carve-out lebih panjang dari `/api/`
  sehingga menang lewat longest-match;
- satu aset identik per site (favicon, logo) → pindah ke path stabil di luar
  `/api/` seperti `brand-icons.ts` (lihat pelajaran 7).

Setelah robots berubah, bersihkan cache edge `robots.txt` (`s-maxage=3600`),
lalu scrape ulang `robots.txt` di debugger Meta sebelum halaman — Meta
menyimpan salinan robots-nya sendiri, jadi satu kali scrape setelah perbaikan
bisa masih ditolak. Pemanasan internal (`social-warm.ts`) memakai fetch biasa
sehingga selalu hijau — ia tidak mempertahankan robots.txt, jadi ia tidak
bisa menangkap kelas bug ini.

Setelah pelajaran 12, tidak ada kode yang bisa menyegarkan kartunya untuk
artikel lama: satu URL hanya diberi tahu Meta sekali seumur hidup. Scraping
manual di Sharing Debugger adalah satu-satunya obat, dan itu konsekuensi yang
disepakati, bukan bug yang menunggu perbaikan.

Peringatan Meta berikutnya setelah `og:image` hijau adalah `Missing Properties:
fb:app_id`.itu bukan error, cuma tanda insights Meta dan atribut link tidak
tersedia. Sumbernya sudah ada: `FB_APP_TOKEN` berformat `APP_ID|APP_SECRET`
(divalidasi `fb_app_token_malformed` di `bootstrap-schema.ts`). Hanya separuh
ID yang boleh jadi metadata dokumen — `tenantFacebook()` di `seo.ts` memotong
sebelum `|`, dan half secret tetap hanya dipakai pemanggil Graph API. Tag
ditambahkan per-surface tenant lewat `...tenantFacebookMetadata()` di
`network-runtime.ts`, bukan di `src/app/layout.tsx` yang metadata-nya statis
(secret tidak ada saat build, dan layout itu sengaja bebas baca host/DB).

## 12. FB debugger: satu kali per URL, saat pertama tayang

Dulu setiap mutasi yang menyangkut artikel menyerahkan URL-nya kembali ke backend
scrape Meta: publish, unpublish, `article.changed`, `article_site.changed`,
perubahan publisher/affiliation/category/author, aktivasi/arsip/metadata media.
Artinya satu edit kecil, atau satu penggantian nama publisher yang menyapu
seluruh artikel milik penerbit itu, membakar kuota aplikasi untuk meng-scrape
ulang URL yang Meta sudah cache sekitar 30 hari. Pemicu yang paling sering adalah
yang paling boros, dan itu kebalikan dari yang desirable.

Keputusan: satu pemanggilan Meta per URL publik, sekali seumur hidup artikel, pada
saat URL itu pertama kali tayang. Scanner lain (WhatsApp, Telegram, Slack, Google)
tidak butuh scrape ulang — mereka diambil saat orang benar-benar membagikan link.

**Penanda ada di `article_sites`, bukan di `articles`.** Satu baris `article_sites`
= satu pasang (artikel, site) = satu URL `https://{host}/{slug}`. Kalau penandanya
di artikel, `article_site.changed` yang menugaskan artikel lama ke situs baru akan
terlewat: URL-nya benar-benar baru dan belum pernah disentuh Meta, padahal
artikelnya bukan baru.

**Marker di database, bukan Redis.** Redis di repo ini akselerasi, tidak pernah
otoritas durable; ledger one-shot yang hilang hanya menimbulkan satu scrape ulang,
bukan kehilangan permanen — tapi hanya kalau penanda ditulis *setelah* Meta
menerima URL. Kalau ditulis lebih dulu, satu outage token akan membuang satu-satunya
warm yang dimiliki selamanya. `mark_social_warm_targets` hanya mengisi NULL, jadi
dispatcher yang tumpang tindih tidak saling menimpa dan panggilannya idempoten.

**Backfill = `published_at`.** Artikel yang sudah live sebelum migrasi 200
dipertahankan dengan cache yang sudah dimiliki Meta, daripada menghabiskan satu
unit kuota per artikel saat pertama kali diedit. Akibatnya himpunan "due" sama dengan
"dipublikasikan sejak migrasi" — persis yang dikuras warmer.

**Reset saat ditarik.** `transitionTarget` dan `unpublishTargets` mengosongkan
penanda saat target jadi `unpublished`, karena URL-nya kembali mati lalu hidup
lagi saat republish dan Meta perlu diberi tahu sekali lagi.

Antrean due dibaca *oldest-first* oleh `due_social_warm_targets`, jadi URL yang
warm-nya gagal atau terpotong oleh anggaran dispatch dilayani sebelum URL yang
lebih baru, dan tetap due untuk menit berikutnya. Pemanasan hanya jalan setelah
minimal satu task selesai, supaya halaman yang di-scrape bukan hasil edge purge
yang belum mendarat. Tanpa `FB_APP_TOKEN` warmer tidak dipasang sama sekali:
tidak ada yang bisa dihangatkan, jadi tidak ada panggilan sia-sia.

Konsekuensi yang diterima secara sadar: menyunting judul, gambar, atau nama
penulis tidak memberi tahu Meta. Kartu yang sudah di-cache tetap isi lama sampai
Meta meng-scrape sendiri atau link dibagikan ulang. Lebih buruk, perbaikan
`robots.txt` tidak memperbaiki artikel lama — sesuai pelajaran 11, scrape manual
lewat Sharing Debugger (urutkan `robots.txt` dulu, baru halamannya) bukan lagi
workaround sementara, melainkan satu-satunya obat, selamanya.

Sweep `/api/internal/maintenance/facebook-prewarm` (17 * * * *) tetap khusus
homepage `https://{host}/` dan tidak tersentuh perubahan ini; `read_runtime_config_active_sites()`
tidak memuat artikel. Index parsial `article_sites_social_warm_due_idx` hanya
memuat baris published yang belum bertanda — kosong pada keadaan steady, 8 kB di
produksi, dan query due membaca indeks itu tanpa sort.

Kalau pemanasan gagal tanpa membuka dispatch, dua event baru itu aparecen:
`delivery.social_warm.due_failed` (ledger tidak terbaca) dan
`delivery.social_warm.mark_failed` (penandaan gagal, target tetap due). Keduanya
sengaja tidak dilempar: warmer bersifat best-effort dan tidak boleh menggagalkan
task invalidasi.

