# Inventaris domain Indicate

> **Status:** Living document (advisory).
> **Owner:** Platform team.
> **Last verified:** 2026-09-25 (Cloudflare API + DB `sites` + Vercel MCP + HTTP 104/104 apex and 10/10 regional `200`).
> **Related:** [active domains](active-domains.md) · [cloudflare baseline](cloudflare-baseline.md)

Hanya domain terkait Indicate yang dicatat di sini — proyek-proyek lain
milik pemilik sengaja tidak dimasukkan. Total zona live di akun Cloudflare
adalah 131 (104 zona tenant Indicate + zona proyek lain milik pemilik).

Tenant live di DB: **424 site = 104 apex + 10 site region + 310 site kota**, dengan rantai `apex → region → city` eksplisit (`sites.site_level` + `sites.parent_site_id`) dan `domains.site_topology` (`national` 94 domain, `regional` 10 domain) yang ditegakkan DB. 10 domain regional menjalankan roster 31 kab/kota Jawa Tengah (`{city}.{apex}` plus `jawa-tengah.{apex}`); 94 apex lainnya declares `national` sehingga tidak boleh punya portal turunan. 104 apex memiliki exact + wildcard Vercel terverifikasi; 320 portal turunan dilayani wildcard regional tanpa exact Vercel (HTTP 320/320 `200`).
Domain utama: `indicate.website` (bukan tenant; migrasi dari `indicate.web.id` 2026-09-24, dual-serve).

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

## B. Tenant live (Exabytes, batch 2026-09-03)

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
