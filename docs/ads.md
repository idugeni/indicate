# Sistem Iklan (Ad Placement)

Satu sistem penempatan iklan untuk seluruh template tenant: satu katalog slot
semantik, satu peta penempatan per template, satu renderer, dan konfigurasi
per tenant tanpa logika kondisional per template di komponen.

## Arsitektur

```text
Template  →  TEMPLATE_AD_MAP  →  AdSlot  →  resolveAdSlot  →  AdContainer
(chrome/       (placement-map)    (ad-slot)    (config: Global →
 pages)                                        Template → Tenant
                                               → Campaign)
```

| Lapisan | Berkas | Tanggung jawab |
|---|---|---|
| Definisi slot | `src/modules/ads/slots.ts` | 14 id semantik + ukuran, rasio cadangan, format, perangkat |
| Peta template | `src/modules/ads/placement-map.ts` | Zona per template, tanpa `if template ===` |
| Kreatif | `src/modules/ads/creatives.ts` | Union `image` / `html` / `provider` + validasi |
| Konfigurasi | `src/modules/ads/config.ts` | Urutan prioritas + override tenant + guard template |
| Rendering | `src/modules/ads/ad-slot.tsx` | `AdSlot`, `AdHeaderTop`, `AdShellTop`, `AdShellBottom` |
| Data tenant | `src/modules/delivery/models.ts` (`settings.ads`) | Override tervalidasi per situs |
| Proyeksi | `src/data/repos/delivery.ts` (`readSettings`) | Parse `site_settings.seo.ads` sekali per render |

Template tidak mengenal penyedia iklan. Template hanya memanggil
`<AdSlot site={site} slot="in-content" />` atau helper zona shell.

## Slot

Slot bersifat semantik (posisi), bukan milik template: `header-top`,
`leaderboard`, `top-banner`, `below-navigation`, `hero-ad`, `in-feed`,
`in-content`, `content-middle`, `content-bottom`, `sidebar-top`,
`sidebar-middle`, `sidebar-bottom`, `mobile-banner`, `footer-banner`.

Setiap slot membawa metadata: `sizes`, `allowedFormats`,
`devices`, `maxWidthPx`, `reserveClass` (aspect-ratio per breakpoint untuk
mencegah CLS), dan `visibilityClass` (`hidden lg:block` untuk sidebar,
`md:hidden` untuk spanduk seluler).

## Peta 10 template

| Template | header | top | listing | article | channel | footer |
|---|---|---|---|---|---|---|
| clean-blue | – | leaderboard | hero-ad, in-feed | in-content, content-middle, content-bottom | content-middle | footer-banner |
| black-lime | – | top-banner | hero-ad, in-feed | in-content, content-middle | in-feed | footer-banner |
| dark-navy | – | below-navigation | hero-ad, sidebar-top | in-content, content-middle, mobile-banner | content-middle | footer-banner |
| glassy-blue | header-top | – | in-feed | in-content, content-bottom | in-feed | footer-banner |
| green-minimal | – | leaderboard | in-feed | in-content, content-bottom | content-middle | footer-banner |
| orange-modern | – | top-banner | hero-ad, in-feed | in-content, content-middle, content-bottom | in-feed | footer-banner |
| purple-editorial | – | below-navigation | hero-ad | in-content, content-middle | content-middle | footer-banner |
| red-editorial | header-top | – | in-feed | in-content, content-bottom, mobile-banner | in-feed | footer-banner |
| soft-blue | – | leaderboard | hero-ad, in-feed | in-content, content-middle | content-middle | footer-banner |
| warm-editorial | – | below-navigation | in-feed | in-content, content-bottom | in-feed | footer-banner |

Slot di luar peta template tidak pernah dirender (`mapped: false`),
sehingga halaman artikel satu kolom tidak dipaksa menjadi dua kolom dan
identitas tiap template utuh. `sidebar-middle` dan `sidebar-bottom`
terdaftar dan didukung renderer, tetapi belum dipetakan karena belum ada
template dengan kolom rel mandiri di tingkat halaman; `sidebar-top`
dipetakan hanya di rel 340px milik dark-navy.

## Konfigurasi tenant

Prioritas: Global Default → Template Default → Tenant Override → Campaign
Override. Tenant override tinggal di `site_settings.seo.ads` (baris
tenant-isolasi yang sama dengan pengaturan situs, tercakup tag cache
`site:`/`org:` yang sudah ada), contoh:

```json
{
  "leaderboard": { "enabled": false },
  "in-content": {
    "creative": {
      "kind": "image",
      "imageUrl": "https://cdn.example/iklan.png",
      "href": "https://pengiklan.example",
      "alt": "Promo"
    }
  }
}
```

Nilai rusak diabaikan parser (`parseTenantAdOverrides`), tidak pernah
merusak halaman. Jalur naik kelas saat dasbor admin tiba adalah tabel
`tenant_ad_settings` khusus; hanya parser yang berubah.

## Perilaku responsif

- Wadah selalu `min-w-0`, lebar fluida, `max-width` sebagai batas atas —
  tanpa lebar piksel tetap, tanpa `overflow-hidden` sebagai penutup masalah.
- Rasio cadangan per breakpoint (`aspect-[320/100] md:aspect-[728/90]`)
  menahan ruang sebelum kreatif tiba.
- Slot sidebar hilang di bawah `lg` (rel runtuh menjadi inline),
  `mobile-banner` hilang di `md` ke atas.
- Slot di atas header (`header-top`) menggulir pergi; tidak ada slot yang
  menempel sehingga tidak menutupi navigasi lengket.
- Iklan disembunyikan saat cetak (`[data-ad-slot]` di aturan print
  `globals.css`).
- Gambar di bawah lipatan memakai `loading="lazy"`; slot zona atas
  dirender eager. Nol JavaScript klien, nol fetch iklan, nol hidrasi.

## Skema database (v245–v246, live)

Delapan tabel di `src/data/schema/ads.ts`, diterapkan forward-only:

| Tabel | Isi |
|---|---|
| `advertisers` | Pemilik iklan per organisasi |
| `campaigns` | Periode, status (`draft`/`scheduled`/`active`/`paused`/`ended`), prioritas |
| `ad_creatives` | Kreatif `image`/`html`/`provider` dengan check bentuk per jenis |
| `ad_slots` | Katalog global 14 slot (tanpa kolom organisasi, seperti `template_presets`), di-seed mirror `slots.ts` |
| `ad_placements` | Ikatan kampanye→slot dengan scope situs/template/perangkat, jendela tayang, prioritas |
| `tenant_ad_settings` | Switch per situs per slot + kreatif kustom; menang atas carrier `seo.ads` per slot |
| `ad_impressions` | Event append-only per hari (siap rollup) |
| `ad_clicks` | Event klik append-only + URL target untuk audit |

RLS `FORCE` + kebijakan `tenant_isolation` untuk peran `indicate_runtime`
di 7 tabel tenant; `ad_slots` memakai aksesori runtime global. v246
menutup 8 FK tanpa indeks penutup yang ditandai advisor. Read path
(`readSettings`) memakai 2 query kecil berindeks (PK situs +
`organization_id, site_id, slot_id, active`) di dalam transaksi yang sama —
tanpa N+1, ter-cache oleh Next cache seperti konten lainnya.

## Dasbor admin (view `Iklan`)

View `ads` di grup Penerbitan, self-fetching seperti panel AI: `AdsManagementPanel`
mengambil `GET /api/dashboard/ads?scope=overview` dan bermutasi via
`POST /api/dashboard/ads` (`AdsService` + `DrizzleAdsRepository`).
Gating memakai grant `site.manage` yang sudah ada — tanpa string permission
baru dan tanpa backfill peran.

Empat tab: **Slot Situs** (switch per slot + kreatif kustom per situs),
**Kampanye** (pengiklan, periode, prioritas, status), **Kreatif**
(gambar/HTML/penyedia), **Penempatan** (kampanye→slot dengan scope
situs/template/perangkat, jendela tayang, prioritas, switch aktif).
Seluruh tulis berversi (konflik → 409 + muat ulang) dan tercatat di
`audit_logs` dalam transaksi yang sama. Setiap mutasi sukses memanggil
`revalidateTag(org:…)` agar halaman publik yang ter-cache langsung segar.

## Ketahanan yang diaudit

- Jendela kampanye (`campaigns.starts_at/ends_at`) ditegakkan di read path,
  bukan hanya status; slot yang dinonaktifkan di katalog (`ad_slots.active`)
  tidak tayang walau ada penempatan.
- URL klik `javascript:` ditolak di validator, skema dasbor, dan normalisasi
  string kosong → null; HTML kreatif tetap di batas peran tepercaya.
- Race insert switch situs (duplikat PK) dipetakan ke konflik 409, bukan 500.
- Kreatif gambar berdimensi memakai rasio aspeknya sendiri sehingga ruang
  cadangan sama persis dengan hasil render (nol CLS).
- Penempatan ber-scope perangkat dilewati di render server (tanpa sinyal
  perangkat tepercaya) dan prioritas tertinggi menang deterministik per slot.

## Batasan tahap ini

- Kreatif `html` berasal dari konfigurasi tepercaya (dasbor harus
  membatasi ke peran tepercaya); tidak ada sanitasi markup di render.
- Kreatif `provider` (AdSense) merender placeholder berlabel dengan atribut
  `data-ad-*` — tanpa injeksi skrip, karena `src/proxy.ts` belum
  mengizinkan host skrip penyedia iklan.
- Tanpa dasbor admin (tulis kampanye/penempatan) dan tanpa beacon
  impresi/klik (rencana: mengikuti pola `ViewBeacon`); tabel baca
  (`tenant_ad_settings`, `ad_placements`) sudah live di read path.

## Verifikasi

- `npm run typecheck`, `npm run lint` (`--max-warnings=0`), dan seluruh
  suite vitest hijau, termasuk 48 uji di `src/modules/ads` dan uji wiring
  `tenant_ad_settings` di `src/data/repos/delivery.test.ts`.
- Cakupan uji: katalog slot, validasi kreatif, peta 10 template,
  prioritas konfigurasi, pemetaan baris DB, render null saat dinonaktifkan/tak dipetakan/
  template asing, tanpa `script` untuk penyedia, tanpa lebar tetap.
