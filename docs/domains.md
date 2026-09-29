# Domain Indicate

> **Status:** Living document.
> **Owner:** Platform team.
> **Role:** satu-satunya tempat yang menyebut domain mana yang terdaftar, kapan setiap aktivasi terjadi, dan berapa banyak yang benar-benar hidup. Inventaris dan kronologi digabung di sini karena keduanya menyebut objek yang sama — membacanya sebagai dua dokumen berarti menghitung dua kali dan menghasilkan dua angka.
> **Last verified:** 2026-09-29.
> **Related:** [cloudflare baseline](cloudflare-baseline.md) · [release](release.md) · [regions](regions.md) · [architecture](architecture.md)

## Angka terkini

Hitung live, bukan disalin dari dokumen. Tiga sumber, tiga hal berbeda — jangan
dicampur jadi satu angka "jumlah domain":

| Yang dihitung | Nilai (2026-09-29) | Sumber | provisioned / observed |
|---|---|---|---|
| Apex tenant | 134 | `select count(*) from sites where site_level = 'apex'` | provisioned |
| Site di DB | 4422 = 134 apex + 134 region + 4154 city, 4422/4422 `active` | `sites` | provisioned dan aktif |
| Asosiasi domain Vercel | 273, **0 unverified** = 134 apex exact + 135 wildcard + 3 control-plane + 1 `vercel.app` | `list_project_domains`, team `safenca`, project `indicate` | provisioned |
| Zona Cloudflare tenant | 134 | `GET /zones` | provisioned |

Empat angka ini pernah berbeda satu sama lain (50, 213, 222 untuk Vercel) karena
masing-masing dihitung pada hari yang berbeda lalu ditulis sebagai fakta
permanen. Kalau butuh angka saat ini, hitung ulang dari sumbernya. Angka di
atas bertanggal dan hanya berlaku sampai batch domain berikutnya.

Peta tenant: setiap apex punya `jawa-tengah.{apex}` (region) plus 31
`{city}.{apex}`, dirantai eksplisit lewat `sites.site_level` +
`sites.parent_site_id`, dengan `domains.site_topology = 'regional'` untuk
seluruh 134 domain. 4288 portal turunan dilayani wildcard apex tanpa exact
Vercel, jadi menambah kota tidak menyentuh Vercel sama sekali.

## Aturan

- Hanya domain terkait Indicate yang tercatat; proyek lain milik pemilik
  sengaja tidak dimasukkan (keputusan 2026-09-16).
- Tidak ada domain yang otomatis jadi tenant. Kolom Tenant? hanya diisi dari
  penunjukan eksplisit pemilik.
- Refresh: ekspor panel registrar + `GET /zones` Cloudflare + RDAP untuk
  tanggal registrar lain; perbarui tanggal verifikasi di header.
- Registrar assigning NS adalah Cloudflare, bukan Vercel. Wildcard
  `*.apex` terbit lewat delegasi `_acme-challenge` per apex, bukan wildcard
  global — lihat [arsip multi-tenant Vercel](vercel-multi-tenant/README.md).
- 59 organisasi customer (UPT Jateng) tetap 0 site: mereka tidak punya hostname
  sendiri, melainkan berafiliasi ke portal kota lewat
  `official_affiliations`. Kebutuhan 59 slot hostname yang pernah diestimasi
  sudah tidak berlaku dan bukan bagian dari inventaris aktif.

## A. IDWebHost, batch 2026-09-16 + domain utama

104 domain zona dibuat dan NS diganti ke Cloudflare pada 2026-09-16 dalam empat
batch (31, 13, 36, 14), semuanya `active` per verifikasi. Batch kelima,
`penamerdeka.my.id` (ID 1082181), 2026-09-18. Seluruh 104 apex pada tabel ini
aktif live per verifikasi 2026-09-25.

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
| gatrapublik.biz.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
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
| sinarperkara.web.id | 2026-09-16 | 2027-09-16 | Aktif | active | YA (apex live) |
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

Sembilan apex, masing-masing dengan regional `wonosobo.{apex}` juga live
(tercakup zona apex masing-masing, tanpa exact Vercel sendiri).

| Domain | Terdaftar | Kedaluwarsa | Template | Tenant? |
|---|---|---|---|---|
| fakta01.my.id | 2026-09-03 | 2027-09-03 | dark-navy | YA (apex live) |
| jurnalism.web.id | 2026-09-03 | 2027-09-03 | red-editorial | YA (apex live) |
| kabar360.biz.id | 2026-09-03 | 2027-09-03 | soft-blue | YA (apex live) |
| liputan99.web.id | 2026-09-03 | 2027-09-03 | glassy-blue | YA (apex live) |
| nusantara24.web.id | 2026-09-03 | 2027-09-03 | orange-modern | YA (apex live) |
| pantaunusantara.web.id | 2026-09-03 | 2027-09-03 | warm-editorial | YA (apex live) |
| suarafakta24.biz.id | 2026-09-03 | 2027-09-03 | clean-blue | YA (apex live) |
| wartakini7.web.id | 2026-09-03 | 2027-09-03 | green-minimal | YA (apex live) |
| wawasannusa.biz.id | 2026-09-03 | 2027-09-03 | black-lime | YA (apex live) |
| penamerdeka.my.id | 2026-09-18 | 2027-09-18 | purple-editorial | YA (apex live) |

## C. Exabytes, batch 2026-09-25 — 10 apex

ID Exabytes 347916–347925, kedaluwarsa 2027-09-25 (RDAP PANDI). NS dipindah
dari parking Masterweb ke Cloudflare 2026-09-26, delegasi terverifikasi 10/10.

| Domain | ID Exabytes | Brand | Template | CF | Vercel | Apex HTTP |
|---|---|---|---|---|---|---|
| sudutindonesia.web.id | 347916 | SudutIndonesia | dark-navy | active | verified | 200 |
| ruangpublik.web.id | 347917 | RuangPublik | red-editorial | active | verified | 200 |
| garisberita.web.id | 347918 | GarisBerita | glassy-blue | active | verified | 200 |
| titikmedia.my.id | 347919 | TitikMedia | orange-modern | active | verified | 200 |
| suarapublik.biz.id | 347920 | SuaraPublik | soft-blue | active | verified | 200 |
| berandanasional.web.id | 347921 | BerandaNasional | green-minimal | active | verified | 200 |
| kabarutama.web.id | 347922 | KabarUtama | warm-editorial | active | verified | 200 |
| fokustrakyat.my.id | 347923 | FokusRakyat | black-lime | active | verified | 200 |
| pusatmedia.biz.id | 347924 | PusatMedia | purple-editorial | active | verified | 200 |
| wartapersada.my.id | 347925 | WartaPersada | clean-blue | active | verified | 200 |

330 site (10 apex + 10 region Jawa Tengah + 310 city), sweep HTTP 330/330
`200` branded, 0 `noindex`. 5 `.web.id`, 3 `.my.id`, 2 `.biz.id`.

## D. Exabytes, batch 2026-09-25 #2 — 20 apex

ID Exabytes 347929–347948 (kontigu, tanpa celah). NS dialihkan dan read-back
20/20 di panel Exabytes. 19 zona dapat pair NS `joan`/`kanye`;
`pikiranpublik.web.id` mendapat pair `ivan`/`tia` — Cloudflare menetapkan pair
acak per zona, jadi pair harus dibaca dari API, bukan diasumsikan.

Lensamata, pikiranpublik, suaradata, fokustrakyat, lensakita24, sudutfakta7,
narasipublik, titikberita9, mediasatu24, ruangredaksi, resonansi, eksposur,
aspirasi, refleksi, sintesa, proyeksi, observasi, konstelasi, artikulasi,
interpretasi — semuanya bereksensi `.web.id` atau `.my.id` atau `.biz.id`
sesuai daftar registrar.

Yang diverifikasi per batch, bukan per domain: 19/20 zona `active`, baseline
56/56 setting identik, 40 asosiasi Vercel dengan 40/40 sertifikat (apex +
wildcard) terbit lewat ACME DNS-01, apex `200` dengan `robots=index, follow`
dan judul branded. Distribusi template 2 per template, bukan per domain.

660 site, 660/660 `active/active`, 660 settings unik, 60 objek R2, 1.180 klaim
`official_affiliations` (20 × 59) dengan fingerprint pemetaan tetap
`distinct = 1` di 134 domain. Sweep akhir 19 domain yang bisa di-resolve:
758/760 `200`, 0 unknown-host, 0 `noindex`; dua sisanya
(`rembang`/`surakarta.ruangredaksi`) `DNS` hanya saat 16 request paralel,
serial 4/4 `200`.

**`fokustrakyat.web.id` masih `pending` di Cloudflare.** PANDI mengembalikan
NXDOMAIN walau RDAP mengonfirmasi terdaftar (registered 2026-09-25) — lag
publikasi delegasi di sisi registry, bukan konfigurasi. NS di registrar sudah
terverifikasi.

**`pemikiranpublik.web.id` tidak pernah ada.** Daftar awal salah; domain
sesungguhnya `pikiranpublik.web.id` (ID 347930). Ketahuan karena guard
membandingkan judul halaman detail Exabytes dengan hostname yang diharapkan
sebelum mengubah NS — tanpa guard itu, NS terpasang ke domain yang salah.
Sebaliknya, `fokustrakyat.web.id` **bukan** koreksi nama: daftar pemilik
sudah benar sejak awal dan itu yang tercatat di Exabytes, RDAP PANDI, DB,
Vercel, Cloudflare, dan R2.

---

## Kronologi aktivasi

Satu baris per batch. Angka platform adalah total site setelah batch itu, bukan
total yang berlaku sekarang — total terkini ada di bagian atas.

| Tanggal | Batch | Hasil |
|---|---|---|
| 2026-09-02 | Migration domain utama | `indicate.website` cut over dari `indicate.web.id`; redirect 308 apex/`www` lama, dual-serve `api`/`webhook`/`media`/`pv`. Pensiun domain lama 2026-09-25: DB nol referensi host lama, asosiasi Vercel lama dilepas, redirect tetap 100% di edge Cloudflare. |
| 2026-09-03 | Exabytes #1 (9 apex) | 9 apex + 10 regional Wonosobo live; template tersebar 1 per template. |
| 2026-09-16 | IDWebHost (104 apex) | Empat batch domain dibuat, NS diganti, delegasi terverifikasi. |
| 2026-09-17 | WAF rollout | WAF 2-rule + Page Shield di 104/104 zona; Bot Fight Mode aktif 104/104. |
| 2026-09-18 | `penamerdeka.my.id` | Apex ke-10 Exabytes, template `purple-editorial`. |
| 2026-09-19 | 25 apex IDWebHost → portal | 25 apex masuk sebagai tenant aktif dengan brand penuh. Platform → 104 site. |
| 2026-09-20 | `jejakkebenaran.my.id` | Apex ke-36, template `red-editorial`. |
| 2026-09-20 | 26 domain stok | 26 domain masuk Vercel `verified` tanpa site; menyajikan landing generik branded, tanpa kebocoran tenant. |
| 2026-09-25 | 104 apex diaktifkan | Penunjukan eksplisit pemilik mengaktifkan seluruh 104 apex IDWebHost. Tidak ada backlog tersisa. |
| 2026-09-25 | Exabytes #2 (10 apex) | 330 site, platform 3.432 → 3.762. |
| 2026-09-26 | Exabytes #3 (20 apex) | 660 site, platform 3.762 → 4.422, apex 114 → 134. |

### Rekonsiliasi Wonosobo

`wonosobo.fakta01.my.id` tercatat satu jejak aktivasi `failed` terminal (5×,
13 Sep 2026, `dependency_unavailable`) — tetapi hostname ini live di tiga
lapis: site DB `active/active`, domain Vercel `verified: true`, HTTP `200`
merender penuh. Artinya aktivasi terjadi di luar saga setelah kegagalan itu.
Baris jejak dibiarkan sebagai riwayat (tidak ditulis ulang) dan saga TIDAK
dijalankan ulang, karena kegagalan terminal akan menonaktifkan site yang sedang
live (`failActivation` terminal → `status inactive`).

## Insiden yang punya pelajaran

Dua penyebab akar yang muncul berulang di setiap batch onboarding. Prosedur
lengkapnya ada di [ops lessons](ops-lessons.md):

1. **`525` pada portal turunan sementara apex `200`.** Bukan soal menunggu
   sertifikat wildcard Cloudflare — cert edge sudah `active` dan SAN-nya
   mencakup wildcard. Penyebabnya **origin TLS**: Vercel hanya auto-issue
   sertifikat apex, jadi `ssl=strict` gagal handshake untuk hostname turunan.
   Solusinya sertifikat wildcard Vercel via ACME **DNS-01** (TXT
   `_acme-challenge` di Cloudflare), satu per apex.
2. **Apex `200` tapi unknown-host `noindex` setelah `525`/`526` hilang.** Bukan
   cache — `tenant-home` ter-prerender ISR (`x-nextjs-prerender: 1`), dan
   onboarding manual melewati saga sehingga tidak ada task invalidasi. Diperbaiki
   dengan task `media.activated` + purge reconciler `scope=invalidation`.

Dua cacat onboarding batch #3 yang juga tercatat di
[cloudflare baseline](cloudflare-baseline.md): task invalidasi hanya memuat
base path sehingga `/logo.png`, `/icon.png`, `/apple-touch-icon.png` menyimpan
404 basi di cache ISR (gejala khas: `manifest` `200` tapi ketiganya `404`); dan
`media.object_key` yang tertulis dengan tanggal berbeda dari objek R2 yang
sesungguhnya ada membuat route media `404` meski beranda tetap `200` — diperbaiki
dengan membaca key asli dari R2 dan `HeadObject` tiap key sebelum menulis DB.
