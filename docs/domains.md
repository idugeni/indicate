# Inventaris domain Indicate

> **Status:** Living document (advisory).
> **Owner:** Platform team.
> **Last verified:** 2026-09-19 (IDWebHost panel + Cloudflare API + RDAP PANDI/Verisign + DB `sites` + Vercel MCP + HTTP HEAD 20/20 `200`).
> **Related:** [active domains](active-domains.md) · [cloudflare baseline](cloudflare-baseline.md)

Hanya domain terkait Indicate yang dicatat di sini — proyek-proyek lain
milik pemilik sengaja tidak dimasukkan. Total zona live di akun Cloudflare
adalah 131 (36 zona Indicate + zona proyek lain milik pemilik).

Tenant live di DB: **20 site = 10 apex + 10 regional** (`wonosobo.*`).
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
23:36 WIB. Kolom Tenant diisi hanya dari penunjukan eksplisit pemilik.
Domain `penamerdeka.my.id` (ID 1082181, didaftarkan 2026-09-18) dibuatkan
zona + NS diganti ke Cloudflare pada 2026-09-18; CF `active` per verifikasi
MCP 2026-09-18, baseline diselaraskan maksimal mengikuti
`docs/cloudflare-baseline.md`.

| Domain | Terdaftar | Kedaluwarsa | IDW | CF | Tenant? |
|---|---|---|---|---|---|
| arsip24publik.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bacazaman.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bahariraya.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bentangkata.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bentara9.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| berandafakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| berandafakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| berandainvestigasi.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bidik24perkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bidikan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bilik7wacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| cakrawalakata.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| cermin24berita.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| denyutpublik.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| faktura.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| garisfakta.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| gatrapublik.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| gerbanginvestigasi.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| gerbangkata.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| guratfakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| guratfakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| independensi.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jajakperkara.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jalurperkara.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jaring9perkara.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jejakkebenaran.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jejakwacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jendelapublik.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jurnalpas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| keberimbangan.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| kelanaberita.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| kepulauanraya.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| kilatan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| kredibilitas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| larasfakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| larikberita.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| lensaperistiwa.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| lintaskarya.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| lintasperbatasan.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| lontarpublik.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| metroinvestigasi.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| muarafakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| nalarharian.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| nawalaperkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| nusantaramerdeka.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| objektivitas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| panggungkata.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| panggungkata.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| pastipas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| penamerdeka.my.id | 2026-09-18 | 2027-09-18 | Aktif | active | YA (apex live) |
| pendarkata.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| pendarkata.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| penyanggafakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| persmerdeka.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| petawacana.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| pijar7kata.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| podiumpublik.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| poroswacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| potretwacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| prabawacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| rantau.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| ranumcerita.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| ranumcerita.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| rekamwacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| rentetan.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| rona24.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| ronafakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| ruangsela.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| runcing.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sela7perkara.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| serambifakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sigapan.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sigapta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sigi9perkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| simpul7perkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sinarperkara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sorotwacana.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| suarabening.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| suarabening.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| suarabentara.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| suarakepulauan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sulukfakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| takarwacana.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| takarwacana.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| tandas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| telusurfakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| terasberita.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| terobosan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| timbang7perkara.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| timbangan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| titik9wacana.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| transpas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| validitas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| wargamerdeka.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| wartaria.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| indicate.web.id | 2026-08-30 | 2027-08-30 | Aktif | active | BUKAN tenant (domain utama lama; redirect 308 ke utama baru, dual-serve sejak 2026-09-24) |
| indicate.website | 2026-09-24 | — | Aktif | pending (zona belum dibuat; NS registrar belum diganti) | BUKAN tenant (domain utama baru) |

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
  dari penunjukan eksplisit pemilik (`apex → regional1, regional2`).
- Refresh: ekspor panel registrar + `GET /zones` Cloudflare + RDAP untuk
  tanggal registrar lain; perbarui tanggal verifikasi di atas.
- Bot Fight Mode: aktif di 104/104 zona (`enable_js` + `fight_mode`,
  2026-09-17, terverifikasi baca-balik per zona).
