# Inventaris domain Indicate (advisory — living document)

Hanya domain terkait Indicate yang dicatat di sini — proyek-proyek lain
milik pemilik sengaja tidak dimasukkan. Terakhir diverifikasi: 2026-09-16
(panel IDWebHost + API Cloudflare + RDAP PANDI/Verisign + database `sites`).

Tenant live di DB: **18 site = 9 apex + 9 regional** (`wonosobo.*`, semua
Exabytes batch 2026-09-03). Domain utama: `indicate.web.id` (bukan tenant).

## A. IDWebHost — batch 2026-09-16 + domain utama

Batch 31 domain dibuatkan zona Cloudflare + NS diganti ke Cloudflare pada
2026-09-16; semua `active` per verifikasi sore harinya. Kolom Tenant diisi
hanya dari penunjukan eksplisit pemilik.

| Domain | Terdaftar | Kedaluwarsa | IDW | CF | Tenant? |
|---|---|---|---|---|---|
| bahariraya.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| berandainvestigasi.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| bidikan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| faktura.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| gerbanginvestigasi.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| independensi.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| jejakkebenaran.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| keberimbangan.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| kepulauanraya.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| kilatan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| kredibilitas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| lintasperbatasan.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| metroinvestigasi.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| muarafakta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| nusantaramerdeka.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| objektivitas.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| penyanggafakta.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| persmerdeka.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| podiumpublik.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| rantau.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| rentetan.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| runcing.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sigapan.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| sigapta.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| suarakepulauan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| tandas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| terobosan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| timbangan.my.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| validitas.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| wargamerdeka.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| wartaria.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | — |
| indicate.web.id | 2026-08-30 | 2027-08-30 | Aktif | active | BUKAN tenant (domain utama) |

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
`wonosobo.suarafakta24.biz.id`, `wonosobo.wartakini7.web.id`,
`wonosobo.wawasannusa.biz.id` (tercakup zona apex masing-masing).

## Aturan main

- Hanya domain terkait Indicate yang tercatat di sini; proyek lain milik
  pemilik tidak dimasukkan (keputusan 2026-09-16).
- Tidak ada domain yang otomatis jadi tenant. Kolom Tenant? hanya diisi
  dari penunjukan eksplisit pemilik (`apex → regional1, regional2`).
- Refresh: ekspor panel registrar + `GET /zones` Cloudflare + RDAP untuk
  tanggal registrar lain; perbarui tanggal verifikasi di atas.
