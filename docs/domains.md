# Inventaris domain Indicate

> **Status:** Living document (advisory).
> **Owner:** Platform team.
> **Role:** satu-satunya tempat yang menyebut **domain mana yang terdaftar** dan status kepemilikannya, plus angka total terkini. Kapan tiap aktivasi terjadi dicatat di [active domains](active-domains.md) sebagai kronologi bertanggal.
> **Last verified:** 2026-09-26 (Cloudflare API + DB `sites` + Vercel MCP + HTTP 104/104 apex and 10/10 regional `200`; RDAP PANDI + delegasi NS publik terverifikasi untuk 10 domain Exabytes baru di bagian C).
> **Related:** [active domains](active-domains.md) · [cloudflare baseline](cloudflare-baseline.md)

Hanya domain terkait Indicate yang dicatat di sini — proyek-proyek lain
milik pemilik sengaja tidak dimasukkan. Zona tenant Indicate = **134 apex**
(satu zona per apex, sesuai bagian A sampai D). Total zona live seluruh akun
Cloudflare belum diverifikasi ulang setelah batch 2026-09-26: angka lama 131
(104 zona tenant + zona proyek lain) sudah tidak berlaku karena 30 apex
ditambahkan, dan connection Cloudflare yang tersedia untuk audit docs ini
menunjuk akun lain (69 zona tenant, tanpa `indicate.website`). Verifikasi ulang
nilai akun perlu akses ke akun Cloudflare pemilik.

Tenant live di DB: **4422 site = 134 apex + 134 site region + 4154 site kota**, dengan rantai `apex → region → city` eksplisit (`sites.site_level` + `sites.parent_site_id`) dan `domains.site_topology = 'regional'` untuk seluruh 134 domain, ditegakkan DB. Keputusan owner 2026-09-25: semua domain memakai Jawa Tengah untuk sementara, jadi tiap domain punya `jawa-tengah.{apex}` plus roster 31 kab/kota (`{city}.{apex}`). 134 apex memiliki exact + wildcard Vercel terverifikasi; 4288 portal turunan dilayani wildcard regional tanpa exact Vercel.
Domain utama: `indicate.website` (bukan tenant; migrasi dari `indicate.web.id` 2026-09-24, dual-serve).
Inventaris tercatat 134 apex: seluruhnya tenant live per 2026-09-26
(104 zona lama di bagian A + B, 10 Exabytes baru di bagian C, 20 Exabytes
batch kedua di bagian D).

## A. IDWebHost — batch 2026-09-16 + domain utama

Batch 31 domain dibuatkan zona Cloudflare + NS diganti ke Cloudflare pada
2026-09-16; semua `active` per verifikasi sore harinya. Batch kedua 13 domain
(sela7perkara, rona24, bentara9, pijar7kata, titik9wacana, cermin24berita,
simpul7perkara, bidik24perkara, sigi9perkara, timbang7perkara, arsip24publik,
bilik7wacana, jaring9perkara) dibeli + dibuatkan zona + NS diganti malam
2026-09-16; delegasi terverifikasi + CF `active` 21:31 WIB. Batch ketiga
36 domain (pendarkata s.d. sorotwacana, ID 1080157–1080192, sudah dimiliki)
dibuatkan zona + NS diganti malam yang sama; delegasi 36/36 terverifikasi
22:18 WIB, CF 36/36 `active`. Batch keempat 14 domain (transpas s.d.
nalarharian, ID 1080206–1080219, dibeli 2026-09-16) dibuatkan zona + NS
diganti malam yang sama; delegasi 14/14 terverifikasi + CF 14/14 `active`
23:36 WIB. Kolom Tenant diisi setelah penunjukan eksplisit pemilik; seluruh 104 apex pada tabel A kini aktif live per verifikasi 2026-09-25.
Domain `penamerdeka.my.id` (ID 1082181, didaftarkan 2026-09-18) dibuatkan
zona + NS diganti ke Cloudflare pada 2026-09-18; CF `active` per verifikasi
MCP 2026-09-18, baseline diselaraskan maksimal mengikuti
`docs/cloudflare-baseline.md`.

| Domain | Terdaftar | Kedaluwarsa | IDW | CF | Tenant? |
|---|---|---|---|---|---|
| arsip24publik.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| bacazaman.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| bahariraya.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| bentangkata.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| bentara9.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| berandafakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| berandafakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| berandainvestigasi.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| bidik24perkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| bidikan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| bilik7wacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| cakrawalakata.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| cermin24berita.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| denyutpublik.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| faktura.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| garisfakta.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| gatrapublik.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| gerbanginvestigasi.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| gerbangkata.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| guratfakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| guratfakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| independensi.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| jajakperkara.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| jalurperkara.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| jaring9perkara.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| jejakkebenaran.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| jejakwacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| jendelapublik.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| jurnalpas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| keberimbangan.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| kelanaberita.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| kepulauanraya.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| kilatan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| kredibilitas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| larasfakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| larikberita.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| lensaperistiwa.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| lintaskarya.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| lintasperbatasan.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| lontarpublik.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| metroinvestigasi.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| muarafakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| nalarharian.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| nawalaperkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| nusantaramerdeka.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| objektivitas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| panggungkata.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| panggungkata.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| pastipas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| penamerdeka.my.id | 2026-09-18 | 2027-09-18 | Aktif | active | YA (apex live) |
| pendarkata.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| pendarkata.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| penyanggafakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| persmerdeka.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| petawacana.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| pijar7kata.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| podiumpublik.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| poroswacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| potretwacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| prabawacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| rantau.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| ranumcerita.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| ranumcerita.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| rekamwacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| rentetan.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| rona24.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| ronafakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| ruangsela.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| runcing.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| sela7perkara.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| serambifakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| sigapan.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| sigapta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| sigi9perkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| simpul7perkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| sinarperkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| sorotwacana.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| suarabening.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| suarabening.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| suarabentara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| suarakepulauan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| sulukfakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| takarwacana.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| takarwacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| tandas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| telusurfakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| terasberita.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| terobosan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| timbang7perkara.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| timbangan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| titik9wacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| transpas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| validitas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| wargamerdeka.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| wartaria.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
| indicate.web.id | 2026-08-30 | 2027-08-30 | Aktif | active | BUKAN tenant (domain utama lama; redirect 308 ke utama baru, dual-serve sejak 2026-09-24) |
| indicate.website | 2026-09-24 | — | Aktif | active (Vercel apex + wildcard; wildcard certificate valid) | BUKAN tenant (domain utama baru) |

## B. Exabytes, batch 2026-09-03 — tenant live

| Domain | Terdaftar | Kedaluwarsa | Tenant? |
|---|---|---|---|
| fakta01.my.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| jurnalism.web.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| kabar360.biz.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| liputan99.web.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| nusantara24.web.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| pantaunusantara.web.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| suarafakta24.biz.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| wartakini7.web.id | 2026-09-03 | 2027-09-03 | YA (apex live) |
| wawasannusa.biz.id | 2026-09-03 | 2027-09-03 | YA (apex live) |

Regional live: `wonosobo.fakta01.my.id`, `wonosobo.jurnalism.web.id`,
`wonosobo.kabar360.biz.id`, `wonosobo.liputan99.web.id`,
`wonosobo.nusantara24.web.id`, `wonosobo.pantaunusantara.web.id`,
`wonosobo.penamerdeka.my.id`, `wonosobo.suarafakta24.biz.id`,
`wonosobo.wartakini7.web.id`,
`wonosobo.wawasannusa.biz.id` (tercakup zona apex masing-masing).

## C. Exabytes, batch 2026-09-25 — 330/330 LIVE

10 domain didaftarkan Exabytes pada 2026-09-25, kedaluwarsa 2027-09-25
(RDAP PANDI), ID Exabytes 347916–347925. NS diubah ke Cloudflare
2026-09-26; delegasi terverifikasi publik di 10/10 hostname
(`joan.ns.cloudflare.com` + `kanye.ns.cloudflare.com`).

**Infra siap 2026-09-26.** 10/10 zona Cloudflare `active` dengan baseline
identik 104 zona tenant — 56/56 setting cocok termuat HSTS
(`max_age=15552000`, `include_subdomains`, `nosniff`) + `early_hints=on`
(keduanya default Free perlu di-set manual; lihat
`docs/cloudflare-baseline.md`), Bot Fight Mode + AI-block off, Page
Shield, 3 ruleset (2/1/4), 9 DNS record (apex + wildcard CNAME proxied
ke Vercel, CAA ×4, SPF, DMARC rua unik, DKIM-null). Universal SSL
`active` (Let's Encrypt) mencakup apex + wildcard di 10/10 zona.
Vercel: exact + wildcard ditambahkan untuk 10 apex, **20/20
`verified: true`**.

**Onboarding tenant selesai 2026-09-26** — 330 site: 10 apex + 10 region
Jawa Tengah + 310 city (31 × 10). Platform 3.432 → **3.762 site**, apex
104 → **114**. 330/330 `active/active`; 330/330 `site_settings` dengan
nama, deskripsi, dan `seo_default_description` unik (330/330 distinct).
30 objek R2: `site-default` 1200×630 (OG card), `site-logo` +
`site-favicon` 512×512 dari gradient huruf awal; huruf S dipakai bersama
`SudutIndonesia`/`SuaraPublik` dengan 2 upload terpisah. Portal turunan
mewarisi `default_media_id` apex dan tetap `logo_media_id`/
`favicon_media_id` `NULL` (320/320) agar cascade berjalan. 330 task
invalidasi `media.activated` dipurge reconciler `scope=invalidation` →
330 `completed`, 0 `failed`.

**Verifikasi HTTP akhir 2026-09-26.** Sweep **330/330 `200`**, seluruhnya
branded, 0 failure, 0 `noindex` (10 apex + 10 `jawa-tengah.*` + 310
`{city}.*`). Aset brand `logo.png`, `icon.png`, `apple-touch-icon.png`,
`manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `rss.xml` `200` di
10/10 apex. Subdomain acak → `200` branded-404 `noindex` (aman, tidak
bocor tenant lain). Isolasi tenant terverifikasi: halaman kota
`wonosobo.sudutindonesia.web.id` tidak memuat brand `SuaraPublik` dan
sebaliknya. Record `_acme-challenge` dibersihkan 10/10 setelah cert
terbit.

**Dua akar masalah yang ditemukan saat onboarding (keduanya sudah
diatasi):**

1. Apex `200` tapi 320 portal `525`. Diagnosis awal saya salah — saya
   menyangka menunggu deploy sertifikat wildcard Cloudflare. Terbukti:
   TLS edge: cert Cloudflare sudah `active` dan valid (SAN
   `*.sudutindonesia.web.id`). Penyebab sebenarnya **origin TLS**:
   Vercel hanya auto-issued cert **apex**, tidak wildcard, sehingga
   `ssl=strict` gagal handshake untuk hostname turunan. Cert wildcard
   Vercel diterbitkan via ACME **DNS-01** (`certs issue --challenge-only`
   → TXT `_acme-challenge` di Cloudflare → `certs issue`). Sekarang
   apex + wildcard cert `20/20`.
2. `525`/`526` gone, tapi apex masih `200` unknown-host `noindex`.
   Penyebabnya bukan cache — `tenant-home` ter-prerender ISR
   (`x-nextjs-prerender: 1`). Karena onboarding manual melewati saga,
   tidak ada task invalidasi. 330 task `media.activated` +
   purge reconciler `scope=invalidation` → 330 `completed`, 0 `failed`.

| Domain | ID Exabytes | Brand | Template | CF | Vercel | Apex HTTP |
|---|---|---|---|---|---|---|
| sudutindonesia.web.id | 347916 | SudutIndonesia | dark-navy | active | verified | 200 |
| ruangpublik.web.id | 347917 | RuangPublik | red-editorial | active | verified | 200 |
| garisberita.web.id | 347918 | GarisBerita | glassy-blue | active | verified | 200 |
| titikmedia.my.id | 347919 | TitikMedia | orange-modern | active | verified | 200 |
| suarapublik.biz.id | 347920 | SuaraPublik | soft-blue | active | verified | 200 |
| berandanasional.web.id | 347921 | BerandaNasional | green-minimal | active | verified | 200 |
| kabarutama.web.id | 347922 | KabarUtama | warm-editorial | active | verified | 200 |
| fokusrakyat.my.id | 347923 | FokusRakyat | black-lime | active | verified | 200 |
| pusatmedia.biz.id | 347924 | PusatMedia | purple-editorial | active | verified | 200 |
| wartapersada.my.id | 347925 | WartaPersada | clean-blue | active | verified | 200 |

Template tersebar 1 per template sehingga distribusi apex menjadi 10–12 per
template (sebelumnya 9–11). Keterangan: 5 `.web.id`, 3 `.my.id`,
2 `.biz.id`.

**Klaim institusi resmi (`official_affiliations`) 2026-09-26.** 590 baris
ditambahkan (10 domain × 59 klaim) dengan menyalin pemetaan kanonik dari
salah satu domain yang sudah ada — pemetaan itu terbukti **seragam di
seluruh 104 domain lama** (`distinct publisher set = 1`, `distinct
publisher→city map = 1`, 59 baris per domain, 29 kota dari 31; `karanganyar`
dan `sukoharjo` tidak diklaim di domain mana pun). Setelah replika:
`official_affiliations` 6.136 → **6.726**, domain tercakup 104 → **114**,
dan fingerprint pemetaan **tetap `distinct = 1` di 114 domain** — tidak
ada penyimpangan. 59 institution × 59 publisher terverifikasi, seluruh
baris `active`, `verified_at` terisi, `claim_scopes = ['site_name']`,
`evidence_reference = 'direktori-resmi'`, `organization_id` konsisten.

Catatan: `verified_at` untuk batch ini di-set `now()` (verifikasi dilalui
untuk 10 portal ini pada 2026-09-26), bukan menyalin timestamp batch lama
`2026-09-25 14:18:29`. Klaim tidak muncul di halaman beranda — baik di
domain baru maupun domain lama — karena `officialAffiliations` hanya
ikut pada query artikel, bukan halaman beranda; ini perilaku yang sama
persis dengan domain lama, bukan gap.

## D. Exabytes, batch 2026-09-25 (#2) — 20 apex, 660 site

20 domain didaftarkan Exabytes 2026-09-25, ID Exabytes 347929–347948
(kontigu, tidak ada celah): lensamata, pikiranpublik, suaradata,
fokusrakyat, lensakita24, sudutfakta7, narasipublik, titikberita9,
mediasatu24, ruangredaksi, resonansi, eksposur, aspirasi, refleksi,
sintesa, proyeksi, observasi, konstelasi, artikulasi, interpretasi.

NS dialihkan ke Cloudflare 2026-09-26 dan diverifikasi read-back 20/20 di
panel Exabytes. 19 zona memakai pair `joan`/`kanye`; `pikiranpublik.web.id`
mendapat pair `ivan`/`tia` dari Cloudflare dan NS-nya mengikuti pair itu —
Cloudflare menetapkan pair acak per zona, jadi pair harus dibaca dari API,
bukan diasumsikan.

**Satu koreksi nama dari daftar awal.** `pemikiranpublik.web.id` tidak
pernah ada; domain sebenarnya `pikiranpublik.web.id` (ID 347930, RDAP
PANDI sudah terbit). Ketahuan karena guard membandingkan judul halaman
detail Exabytes dengan hostname yang diharapkan sebelum mengubah NS —
tanpa guard itu, NS akan dipasang ke domain yang salah.

`fokustrakyat.web.id` **bukan** koreksi nama: domain dengan ejaan itu
tidak pernah ada. Daftar pemilik sudah benar sejak awal
(`fokusrakyat.web.id`, "fokus" + "rakyat") dan itu yang tercatat di
Exabytes, RDAP PANDI, DB, Vercel, Cloudflare, dan R2. Auditori ejaan atas
seluruh text column DB, Vercel domains + certs, zona + DNS Cloudflare,
dan seluruh objek R2 memberi 0 hit untuk varian `fokustrakyat`.

Baseline Cloudflare identik 104+10 zona lama (56/56 setting, HSTS +
`early_hints`, bot, Page Shield, 3 ruleset, 9 DNS record). Vercel exact +
wildcard 40/40, cert apex + wildcard terbit 40/40 lewat ACME DNS-01.
Platform 3.762 → **4.422 site**, apex 114 → **134**. 660/660 `active/active`,
660/660 `site_settings` unik, 60 objek R2, 1.180 klaim
`official_affiliations` (20 × 59) dengan fingerprint pemetaan tetap
`distinct = 1` di 134 domain.

Template tersebar rata 2 per template (10 template × 2).

`fokusrakyat.web.id` masih `pending` di Cloudflare: PANDI mengembalikan
NXDOMAIN untuk domain tersebut walau RDAP mengonfirmasi terdaftar
(registered 2026-09-25). Ini lag publikasi delegasi di sisi registry,
bukan konfigurasi — NS di registrar sudah `joan`/`kanye` terverifikasi.

## Aturan main

- Hanya domain terkait Indicate yang tercatat di sini; proyek lain milik
  pemilik tidak dimasukkan (keputusan 2026-09-16).
- Tidak ada domain yang otomatis jadi tenant. Kolom Tenant? hanya diisi
  dari penunjukan eksplisit pemilik; penunjukan 2026-09-25 mengaktifkan
  seluruh 104 apex tenant yang terdaftar.
- Refresh: ekspor panel registrar + `GET /zones` Cloudflare + RDAP untuk
  tanggal registrar lain; perbarui tanggal verifikasi di atas.
- Bot Fight Mode: aktif di 104/104 zona (`enable_js` + `fight_mode`,
  2026-09-17, terverifikasi baca-balik per zona).
