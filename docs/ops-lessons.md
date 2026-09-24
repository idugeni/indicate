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

Limit domain Vercel adalah **50 per project** (`project_domain_limit_reached`),
bukan 250. Setiap hostname (apex maupun regional) makan 1 slot dan butuh
asosiasi exact — wildcard Cloudflare tidak menggantikan slot Vercel.
Target CNAME project stabil (`58a0c0dd872d3769.vercel-dns-017.com`,
proxied) dipakai ulang untuk semua zona.

## 6. Ledger md adalah definition-of-done

Setiap perubahan domain/hostname wajib dicatat di
`docs/active-domains.md` (status DB + Vercel + HTTP + kuota) pada giliran
yang sama — bukan belakangan.
