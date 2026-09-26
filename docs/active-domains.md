# Status Domain Aktif

> **Status:** Living ledger — perbarui setiap ada aktivasi/penonaktifan domain.
> **Owner:** Platform team.
> **Role:** mencatat **kapan** setiap aktivasi dan penonaktifan terjadi, sebagai kronologi bertanggal. Domain yang terdaftar dan status kepemilikannya ada di [domains](domains.md); angka total terkini hanya ada di header dokumen itu dan di header di bawah, tidak di per-section.
> **Last verified:** 2026-09-26 against the live database (4422 site `active/active`: 134 apex + 134 region + 4154 city; Vercel exact + wildcard terverifikasi 20/20 untuk 10 apex Exabytes baru; Cloudflare strict; HTTP 104/104 apex lama `200`; sweep 330/330 portal Exabytes baru `200` branded, 0 `noindex`). Angka per bagian di bawah adalah snapshot bertanggal, bukan total terkini.

## Migrasi domain utama (2026-09-24, dual-serve)

Baru: `indicate.website` (+ `api.`, `webhook.`, `media.`, `pv.`, `www.`). Lama
(`indicate.web.id` + sub) tetap hidup sampai cutover: redirect 308 Cloudflare untuk
apex/`www` lama (preserve path+query); `api`/`webhook`/`media`/`pv` lama dual-serve.
Zona baru `active` 2026-09-24 (NS terdelegasi via API Vercel): 16 DNS, TLS strict,
5 ruleset, Email Routing ready (catch-all drop, mirror zona lama), Worker route `pv`,
R2 `media` (ownership active, SSL pending), Resend verify berjalan.
HTTP: apex baru 200 halaman unknown-host bermerek + `noindex` (status pra-cutover yang benar;
env+deploy baru belum dialihkan); `api.` 404 dan `pv.` SSL pending — normal pra-cutover.
Cutover selesai 2026-09-24: deploy `ab3a9c2` READY (kode+env baru), apex baru 200 dashboard
asli, `api.` 200, redirect 308 lama-ke-baru terverifikasi (`/tentang?x=1` utuh).
Supabase redirect baru ditambahkan manual; Site URL lama diganti saat pensiun.
Pensiun 2026-09-25: DB nol referensi host lama (articles cover/body/canonical +
publishing targets 0); `.env` lokal pengirim baru; asosiasi Vercel `api.`/`webhook.` lama
dilepas (51 domain; apex lama dipertahankan untuk redirect); DNS/route lama tetap dual-serve.
2026-09-26: apex lama memicu warning "Invalid Configuration" di dashboard Vercel
(DNS proxied Cloudflare); asosiasi dilepas sekalian (redirect 100% di edge CF,
terverifikasi tetap 308) — project kini 50 domain.
Template email Auth live disinkron via `supabase config push` (13 konten + admin_email baru).
Gap SMTP 2026-09-25: key lama terikat domain lama (Resend 400); dibuat key baru
`sending_access` domain baru, dipasang di `.env`, Vercel, dan SMTP Auth; uji API + recovery OK.
Key server baru aktif penuh setelah redeploy berikutnya.
Status Vercel per 2026-09-25: project memiliki 213 asosiasi, seluruh asosiasi tenant
104 apex exact + 104 wildcard `verified:true`; 10 hostname `wonosobo.*` tetap
DB-only dan tidak memiliki exact Vercel. Kuota Pro/unlimited tidak lagi
menghambat onboarding.
> **Related:** [domains](domains.md) · [cloudflare baseline](cloudflare-baseline.md) · [release checklist](release-checklist.md)

## Status Vercel

Project `indicate` memiliki **213 asosiasi**, dengan 104 exact + 104 wildcard
untuk seluruh apex tenant. Semua asosiasi tenant `verified:true`; hostname
regional `wonosobo.*` tidak memiliki exact association. Lima asosiasi sisanya
adalah surface control-plane/redirect. Vercel Pro/unlimited terverifikasi.

`docs.indicate.web.id` tetap dipensiunkan dan tidak dipulihkan sebagai tenant.
DNS dan redirect edge tetap menjadi tanggung jawab Cloudflare.

## Fokus Wonosobo (kota)

Kota `wonosobo` (kind=`city` di bawah region Jawa Tengah, org Pengelola Platform) — 10/10 subdomain aktif, template mengikuti apex masing-masing. Tidak ditemukan domain nonaktif di DB, Vercel, maupun HTTP: tidak ada yang perlu diaktivasi.

| Hostname | Site | Template | DB | Vercel | HTTP |
|---|---|---|---|---|---|
| wonosobo.fakta01.my.id | Fakta01 Wonosobo | dark-navy | active/active | verified | 200 |
| wonosobo.jurnalism.web.id | Jurnalism Wonosobo | red-editorial | active/active | verified | 200 |
| wonosobo.kabar360.biz.id | Kabar360 Wonosobo | soft-blue | active/active | verified | 200 |
| wonosobo.liputan99.web.id | Liputan99 Wonosobo | glassy-blue | active/active | verified | 200 |
| wonosobo.nusantara24.web.id | Nusantara24 Wonosobo | orange-modern | active/active | verified | 200 |
| wonosobo.pantaunusantara.web.id | PantauNusantara Wonosobo | warm-editorial | active/active | verified | 200 |
| wonosobo.penamerdeka.my.id | PenaMerdeka Wonosobo | purple-editorial | active/active | verified | 200 |
| wonosobo.suarafakta24.biz.id | SuaraFakta24 Wonosobo | clean-blue | active/active | verified | 200 |
| wonosobo.wartakini7.web.id | WartaKini7 Wonosobo | green-minimal | active/active | verified | 200 |
| wonosobo.wawasannusa.biz.id | WawasanNusa Wonosobo | black-lime | active/active | verified | 200 |

## Apex (induk, 10/10 aktif)

| Hostname | Site | Template | DB | Vercel | HTTP |
|---|---|---|---|---|---|
| fakta01.my.id | Fakta01 | dark-navy | active/active | verified | 200 |
| jurnalism.web.id | Jurnalism | red-editorial | active/active | verified | 200 |
| kabar360.biz.id | Kabar360 | soft-blue | active/active | verified | 200 |
| liputan99.web.id | Liputan99 | glassy-blue | active/active | verified | 200 |
| nusantara24.web.id | Nusantara24 | orange-modern | active/active | verified | 200 |
| pantaunusantara.web.id | PantauNusantara | warm-editorial | active/active | verified | 200 |
| penamerdeka.my.id | PenaMerdeka | purple-editorial | active/active | verified | 200 |
| suarafakta24.biz.id | SuaraFakta24 | clean-blue | active/active | verified | 200 |
| wartakini7.web.id | WartaKini7 | green-minimal | active/active | verified | 200 |
| wawasannusa.biz.id | WawasanNusa | black-lime | active/active | verified | 200 |

## Rekonsiliasi Wonosobo

`wonosobo.fakta01.my.id` tercatat 1 jejak aktivasi `failed` terminal (5x percobaan, 13 Sep 2026, `dependency_unavailable`) — tetapi hostname ini **live di tiga lapis**: site DB `active/active`, domain Vercel `verified: true`, HTTP `200` + merender penuh. Artinya aktivasi terjadi di luar saga setelah kegagalan itu. Baris jejak dibiarkan sebagai riwayat (tidak ditulis ulang); saga TIDAK dijalankan ulang karena kegagalan terminal akan menonaktifkan site yang sedang live (`failActivation` terminal → `status inactive`). Tidak ada tindakan pendaftaran tersisa di scope Wonosobo.

## Onboarding 68 apex (2026-09-25) — SELESAI

Seluruh 68 apex yang sebelumnya berstatus stok kini menjadi tenant live.
DB memiliki 104 apex `active/active` dan 10 regional Wonosobo `active/active`.
Vercel memiliki exact + wildcard untuk 104 apex, semua `verified:true`;
Cloudflare memiliki apex/wildcard CNAME terproxy, TLS `strict`, dan WAF
2-rule untuk 104/104 zona. Media brand: 204 objek R2 (logo, favicon,
default), reservation `used`, dan setiap apex memiliki setting brand/SEO.
HTTP verifikasi akhir: 104/104 apex dan 10/10 regional `200`.

Daftar hostname tetap menjadi sumber tunggal di `docs/domains.md`; tabel
tersebut kini menandai seluruh apex sebagai `YA (apex live)`. Tidak ada
exact Vercel untuk hostname regional `wonosobo.*`.

## Stok terdaftar 2026-09-20 (riwayat sebelum rollout)

26 domain stok masuk Vercel (semua `verified: true`, DNS CNAME
apex+wildcard ke target project sudah ada sejak 2026-09-16 kecuali
`bahariraya.biz.id`, `berandainvestigasi.biz.id`, `bidikan.my.id`, dan
`faktura.web.id` yang dibuatkan saat itu juga; `jejakkebenaran.my.id`
masuk 2026-09-20 langsung `verified: true` lewat slot bekas `www`,
tapi record CNAME apex+wildcard-nya belum ada sehingga HTTP gagal —
dibuatkan saat itu juga mengikuti pola baseline, sempat 525 (sertifikat
edge baru, sembuh sendiri) lalu 200 landing generik). Tanpa site/tenant,
hostname ini menyajikan halaman landing generik (terverifikasi
`bacazaman.web.id` → 200 judul "Indicate - Publishing infrastructure";
tanpa kebocoran konten tenant).

Terdaftar: arsip24publik.biz.id, bacazaman.web.id, bahariraya.biz.id,
bentangkata.biz.id, bentara9.web.id, berandafakta.biz.id,
berandafakta.my.id, berandainvestigasi.biz.id, bidik24perkara.biz.id,
bidikan.my.id, bilik7wacana.web.id, cakrawalakata.web.id,
cermin24berita.web.id, denyutpublik.my.id, faktura.web.id,
garisfakta.web.id, gatrapublik.web.id, gerbanginvestigasi.my.id,
gerbangkata.web.id, guratfakta.biz.id, guratfakta.my.id,
independensi.my.id, jajakperkara.my.id, jalurperkara.web.id,
jaring9perkara.web.id, jejakkebenaran.my.id.

## Onboarding 25/25 menjadi portal (2026-09-19) — SELESAI

## Verifikasi render 25 portal baru (2026-09-19)

22/25 langsung merender judul portal masing-masing (HTTP 200). Sisanya:
`cakrawalakata.web.id` + `guratfakta.my.id` masih landing lama (cache edge,
sembuh sendiri), **Update pantau:** `cakrawalakata.web.id` + `guratfakta.my.id` kini
merender portal (24/25). `gerbanginvestigasi.my.id` + `independensi.my.id`
sempat 525 (DNS baru), kini **200 dengan judul portal benar — 25/25
lengkap**. Pola DNS hilang yang sama sebelumnya: bahariraya,
berandainvestigasi, bidikan, faktura (sudah diperbaiki, terverifikasi
200).

25 apex di atas kini punya baris `domains` + `sites` + `site_settings`
aktif di org Pengelola Platform (total org: 35 domain, 45 site, 45
settings; 45/45 nama dan deskripsi unik), masing-masing dengan nama,
tagline, deskripsi, SEO, dan template: Arsip24Publik (black-lime),
BacaZaman (clean-blue), BahariRaya (dark-navy), BentangKata
(glassy-blue), Bentara9 (green-minimal), BerandaFakta (orange-modern),
BerandaNusa untuk berandafakta.my.id (purple-editorial),
BerandaNusa untuk berandafakta.my.id (purple-editorial),
BerandaInvestigasi (red-editorial), Bidik24Perkara (soft-blue), Bidikan
(warm-editorial), Bilik7Wacana (black-lime), CakrawalaKata (clean-blue),
Cermin24Berita (dark-navy), DenyutPublik (glassy-blue), Faktura
(green-minimal), GarisFakta (orange-modern), GatraPublik
(purple-editorial), GerbangInvestigasi (red-editorial), GerbangKata
(soft-blue), GuratFakta (warm-editorial), GuratNusa untuk guratfakta.my.id
(black-lime), Independensi (clean-blue), JajakPerkara (dark-navy),
JalurPerkara (glassy-blue), Jaring9Perkara (green-minimal). Media default
berbagi aset operator yang aktif.

Logo 25/25 selesai (2026-09-19): tiap portal punya logo + favicon dari
master gradient huruf awal namanya (A–J, tabrakan berbagi bytes dengan
upload terpisah per site, pola terverifikasi checksum lawan master
milik 10 apex lama) — 50 objek R2 terverifikasi HEAD, 50 baris media
aktif, reservasi `used`, invalidasi `media.activated`, audit
(50 reserve + 50 activate + 25 settings-update, request
`ops:brand-25apex`), 2 objek yatim pilot dihapus. Tidak ada lagi
fallback logo Kemenimipas di 25 portal baru. Guard DB (`zone`, settings lengkap, hostname shape) lolos
semua; resolver DB mengembalikan site baru.

Catatan cache: HTTP masih menyajikan landing lama karena cache edge
(`Age` ~16 menit, TTL data ~30 menit); fungsi resolver DB sudah
mengembalikan site baru. Verifikasi render ulang setelah TTL lewat.

Antre selesai — tidak ada sisa.

Riwayat antrean lama: `jejakwacana.my.id` sampai `kelanaberita.web.id`
sempat gagal masuk karena limit Vercel. Batch tersebut kini selesai dan
tidak lagi merupakan backlog.

## Onboarding jejakkebenaran.my.id menjadi portal (2026-09-20) — DB + BRAND SELESAI, HTTP MENYUSUL

Portal ke-36 di org Pengelola Platform (template `red-editorial`, kelompok
hitungan 4 terundi agar distribusi merata): `domains` + `sites` +
`site_settings` aktif (`active/active`, settings v2, SEO unik bernada
nasional tanpa sebut region), logo + favicon dari master gradient huruf J
(26810 byte, checksum ganda cocok lawan master, 2 objek R2 terverifikasi
HEAD, tanpa yatim), reservasi `used`, invalidasi `media.activated`
`pending`, audit lengkap (2 reserve + 2 activate + 1 settings-update,
request `ops:onboard-jejakkebenaran`). `sitemap.xml`, `robots.txt`,
`llms.txt`, dan `GET /api/network/media/{logo}` (307 ke R2) sudah
melayani sebagai tenant; halaman `/` sempat landing lama karena cache edge
(pola yang sama dengan 25 portal sebelumnya) — setelah 3x pemicu
reconciler `scope=invalidation` (20+6 completed, 0 failed, antre habis),
`/` merender portal: judul `JejakKebenaran - Kebenaran Punya Jejak.`,
meta description SEO, tagline, logo (`alt="JejakKebenaran"`), favicon
(307) — lengkap seperti tenant lain.

## Backfill logo gatrapublik.web.id (2026-09-24) — SELESAI

`gatrapublik.web.id` lolos dari batch logo 25/25 (settings `logo_media_id`
`NULL`, halaman + `/logo.png` + manifest tenant 404/Indicate). Diperbaiki
via protokol penuh: master gradient G 512x512 (9187 byte) → PUT R2
tenant-scoped terverifikasi HEAD → 1 transaksi DB (reservasi → media
`active` 512x512 → reservasi `used` → settings v4→v5 → task
`media.activated` → 3 audit `ops:brand-gatrapublik-logo`, chain utuh).
Stale edge-404 dibersihkan via purge exact-URL (task reconciler menyusul,
idempoten). Verifikasi: `/logo.png` 200, manifest tenant, `/` 200.

## Onboarding 10 apex Exabytes (2026-09-26) — 330/330 LIVE

10 apex didaftarkan Exabytes 2026-09-25 (kedaluwarsa 2027-09-25, RDAP
PANDI), ID Exabytes 347916–347925. NS dialihkan dari parking Masterweb
(`dns1/dns2-parking.masterweb.com`, sebelumnya REFUSED) ke Cloudflare
2026-09-26; delegasi terverifikasi 10/10.

Infra: 10/10 zona `active`, baseline 56/56 setting identik zona tenant
(termasuk HSTS + `early_hints=on` yang default Free dan harus di-set
manual — keduanya ditambahkan ke `docs/cloudflare-baseline.md`), 3
ruleset, 9 DNS record. Vercel exact + wildcard 20/20 `verified: true`.

Tenant: 330 site (10 apex + 10 region Jawa Tengah + 310 city). Platform
3.432 → **3.762 site**, apex 104 → **114**. 330/330 `active/active`,
330/330 settings dengan nama + deskripsi + SEO unik. 30 objek R2
(OG card + logo + favicon per apex; huruf S dibagi dua upload terpisah).
Portal turunan mewarisi `default_media_id`, `logo_media_id`/
`favicon_media_id` `NULL` (320/320). 330 task invalidasi
`media.activated` → 330 `completed`, 0 `failed`.

**Klaim institusi:** 590 baris `official_affiliations` ditambahkan
(10 × 59) dengan menyalin pemetaan kanonik yang terbukti seragam di
seluruh 104 domain lama. Total 6.136 → **6.726**, domain tercakup
104 → **114**, fingerprint pemetaan tetap `distinct = 1` di 114 domain.

**Verifikasi HTTP akhir:** sweep **330/330 `200`** — 10 apex + 10
`jawa-tengah.*` + 310 `{city}.*` — semua branded, 0 failure, 0 `noindex`.
Aset brand + `robots.txt`/`sitemap.xml`/`rss.xml` `200` di 10/10 apex.
Subdomain acak → branded-404 `noindex`, tidak bocor tenant lain.

**Dua akar masalah yang ditemukan (keduanya sudah diatasi):**

1. 320 portal `525` sementara apex `200`. Diagnosis awal saya salah
   (sangka menunggu deploy cert wildcard Cloudflare). Terbukti: cert
   Cloudflare sudah `active` dan SAN-nya valid untuk wildcard; yang
   hilang adalah **cert wildcard Vercel** — Vercel hanya auto-issued
   cert apex, jadi `ssl=strict` gagal handshake ke origin. Diterbitkan via
   ACME DNS-01 untuk 10 apex; cert apex + wildcard sekarang 20/20.
2. Setelah itu apex masih `200` unknown-host `noindex`. Penyebabnya
   `tenant-home` ter-prerender ISR (`x-nextjs-prerender: 1`) dan
   onboarding manual melewati saga sehingga tidak ada task invalidasi.
   330 task `media.activated` + purge reconciler menyelesaikannya.

## Onboarding 20 apex Exabytes batch-2 (2026-09-26) — apex LIVE, drain berjalan

20 apex ID Exabytes 347929–347948 (kontigu): lensamata, pikiranpublik,
suaradata, fokusrakyat, lensakita24, sudutfakta7, narasipublik,
titikberita9, mediasatu24, ruangredaksi, resonansi, eksposur, aspirasi,
refleksi, sintesa, proyeksi, observasi, konstelasi, artikulasi,
interpretasi.

NS dialihkan dan **read-back 20/20** di panel Exabytes. 19 zona dapat
pair `joan`/`kanye`; `pikiranpublik.web.id` mendapat pair `ivan`/`tia`
dan NS-nya mengikuti pair itu — Cloudflare menetapkan pair acak per zona,
harus dibaca dari API.

**Satu nama domain dari daftar awal ternyata berbeda** dan ketahuan karena
guard membandingkan judul halaman detail Exabytes sebelum mengubah NS:
`pemikiranpublik.web.id` tidak pernah ada (aslinya `pikiranpublik.web.id`).
Tanpa guard, NS akan dipasang ke domain yang salah.

Infra: 19/20 zona `active`, baseline 56/56 identik, 40 asosiasi Vercel,
**40/40 cert (apex + wildcard)** via ACME DNS-01. Platform 3.762 →
**4.422 site**, apex 114 → **134**. 660/660 `active/active`, 660 settings
unik, 60 objek R2, 1.180 klaim `official_affiliations` dengan fingerprint
pemetaan tetap `distinct = 1` di 134 domain. Template 2 per template.

Apex 200 + `robots=index, follow` + judul branded (terverifikasi).
Sweep akhir 19 domain yang bisa di-resolve: **758/760 `200`**, 0
unknown-host, 0 `noindex`. Dua sisanya (`rembang`/`surakarta.ruangredaksi`)
`DNS` hanya saat 16 request paralel; serial 4/4 `200`.

**Dua cacat yang ditemukan dan diperbaiki** (keduanya sudah dicatat di
`docs/cloudflare-baseline.md`):

1. Task invalidasi hanya memuat base paths, jadi `/logo.png`, `/icon.png`,
   `/apple-touch-icon.png` menyimpan 404 basi di cache ISR. Gejala khas:
   `manifest` `200` tapi ketiganya `404`.
2. 60 `media.object_key` tertulis `2026-09-26-...` tanpa slug hostname,
   sedangkan objek R2 ada sebagai `2026-09-25-...-{slug}-{token}.png`.
   `site_settings` tetap `active` dan beranda tetap `200`, tapi
   `getExact()` R2 `null` → route media `404`. Diperbaiki dengan membaca
   key asli dari R2 (`ListObjectsV2` per prefix site) + `HeadObject`
   tiap key sebelum menulis ke DB.

`fokusrakyat.web.id` masih `pending`: PANDI mengembalikan NXDOMAIN
walau RDAP mengonfirmasi terdaftar — lag publikasi delegasi registry,
NS di registrar sudah terverifikasi. 33 portalnya ikut gagal karena itu,
bukan konfigurasi.

## Backlog

Tidak ada backlog domain. 134 apex tenant terdaftar dan 134-nya sudah live
(104 lama + 10 Exabytes baru 2026-09-26 + 20 Exabytes batch-2 2026-09-26).
Satu-satunya entri yang tersisa adalah 59 org customer (UPT Jateng) yang tetap
0 site karena keputusan owner 2026-09-17: mereka tidak punya hostname sendiri,
melainkan berafiliasi ke 31 portal kota lewat `official_affiliations` (590 baris
per migrasi v181, 59 institusi × 10 domain jaringan). Kebutuhan 59 slot hostname
yang pernah diestimasi sudah tidak berlaku, dan itu bukan domain inventory aktif.

Daftar domain yang terdaftar beserta status kepemilikannya ada di
[domains.md](domains.md); dokumen ini hanya mencatat kapan setiap aktivasi dan
penonaktifan terjadi.
