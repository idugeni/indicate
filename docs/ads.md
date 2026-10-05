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
| Peta template | `src/modules/ads/placement-map.ts` | Zona per template (`header/top/listing/article/channel/search/anchor/footer`), tanpa `if template ===` |
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
`md:hidden` untuk spanduk seluler). `top-banner` memetakan
Mobile 320×100 → Tablet 728×90 → Desktop 970×250, dengan rasio cadangan
yang sama persis di tiap breakpoint. `sidebar-bottom` khusus unit tinggi
(300×600, 160×600); slot persegi memakai `sidebar-top`. `mobile-banner`
hanya dirender `MobileAnchorSlot` di cangkang — tidak pernah di alir halaman.

## Peta 10 template

| Template | header | top | listing | article | channel | search | anchor | footer |
|---|---|---|---|---|---|---|---|---|
| clean-blue | – | leaderboard | hero-ad, in-feed | ※ | content-middle | in-feed | mobile-banner | footer-banner |
| black-lime | – | top-banner | hero-ad, in-feed | ※ | in-feed | in-feed | mobile-banner | footer-banner |
| dark-navy | – | below-navigation | hero-ad, sidebar-top, sidebar-bottom | ※ | content-middle | in-feed | mobile-banner | footer-banner |
| glassy-blue | header-top | – | in-feed | ※ | in-feed | in-feed | mobile-banner | footer-banner |
| green-minimal | – | leaderboard | in-feed | ※ | content-middle | in-feed | mobile-banner | footer-banner |
| orange-modern | – | top-banner | hero-ad, in-feed | ※ | in-feed | in-feed | mobile-banner | footer-banner |
| purple-editorial | – | below-navigation | hero-ad | ※ | content-middle | in-feed | mobile-banner | footer-banner |
| red-editorial | header-top | – | in-feed | ※ | in-feed | in-feed | mobile-banner | footer-banner |
| soft-blue | – | leaderboard | hero-ad, in-feed | ※ | content-middle | in-feed | mobile-banner | footer-banner |
| warm-editorial | – | below-navigation | in-feed | ※ | in-feed | in-feed | mobile-banner | footer-banner |

※ = `in-content, content-middle, content-bottom, sidebar-top, sidebar-bottom`
— zona artikel identik di semua template by design (dijaga `ad-matrix.test.tsx`).

Slot di luar peta template tidak pernah dirender (`mapped: false` → `enabled: false`
di `resolveAdSlot`, diferifikasi `ad-matrix.test.tsx`). `mobile-banner`
sengaja tidak ada di zona alir mana pun: cangkang adalah satu-satunya
perender lewat `MobileAnchorSlot`, sehingga setiap halaman ponsel memuat
tepat satu unit (dijaga `page-ad-single.test.tsx`).
`sidebar-middle` terdaftar dan didukung renderer, tetapi belum dipetakan
di template mana pun — cadangan untuk rel masa depan; `sidebar-top` dan
`sidebar-bottom` ada di artikel semua template dan di listing dark-navy.

## Konfigurasi tenant

Prioritas: Global Default → Template Default → Tenant Override → Campaign
Override. Sumber otoritatif adalah tabel `tenant_ad_settings` (ditulis
dasbor admin per situs per slot). Tas JSON lama `site_settings.seo.ads`
hanya kompatibilitas baca: tidak pernah ditulis kode aplikasi dan kalah di
setiap penggabungan per slot (`readSettings` di `src/data/repos/delivery.ts`).
Contoh override tenant:

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
merusak halaman. Penulisan selalu ke tabel `tenant_ad_settings` via dasbor
admin (`POST /api/dashboard/ads`); tas JSON tidak lagi ditulis dan hanya
dibaca sampai baris warisan terakhir termigrasi.

## Perilaku responsif

- Wadah selalu `min-w-0`, lebar fluida, `max-width` sebagai batas atas —
  tanpa lebar piksel tetap, tanpa `overflow-hidden` sebagai penutup masalah.
- Rasio cadangan per breakpoint (`aspect-[320/100] md:aspect-[728/90]`)
  menahan ruang sebelum kreatif tiba. `top-banner` memakai tiga anak tangga
  penuh (`320/100 → 728/90 → 970/250`) agar billboard desktop tidak
  menggeser layout saat kreatif HTML/penyedia tiba tanpa dimensi.
- Setiap halaman pencarian memuat satu `in-feed` antara formulir dan hasil
  (hanya saat ada hasil), memakai arsitektur slot yang sama.
- Setiap slot terisi menampilkan label `Iklan` kecil yang terlihat di atas
  kreatif — dirender server bersama slot sehingga tidak menambah layout shift.
- Slot sidebar hilang di bawah `lg` (rel runtuh menjadi inline),
  `mobile-banner` hilang di `md` ke atas.
- Slot di atas header (`header-top`) menggulir pergi; satu-satunya elemen
  menempel adalah jangkar ponsel (`sticky bottom-0`) yang menyisakan ruang
  alir di akhir halaman sehingga tidak menutup footer.
- Ritme vertikal milik slot (`my-6`, `md:my-8`, runtuh dengan tetangga),
  bukan penempatan: 24px di ponsel agar hemat viewport, 32px di desktop
  menyamai ritme teks (`mt-8`). Satu-satunya pengecualian adalah jangkar
  ponsel yang menetralkannya (`[&_[data-ad-slot]]:my-0`) agar bilah tetap
  ramping.
- Iklan disembunyikan saat cetak (`[data-ad-slot]` di aturan print
  `globals.css`).
- Gambar di bawah lipatan memakai `loading="lazy"`; slot zona atas
  dirender eager. Nol JavaScript klien, nol fetch iklan, nol hidrasi.
- Render gambar adalah responsive display (lebar 100%, tinggi otomatis
  dari atribut dimensi) — default yang direkomendasikan Google. `sizes`
  per slot mencakup unit standar Google termasuk 468×60, 160×600,
  300×200/100/50, dan 250×250.

## AdSense penuh

- Kreatif `provider` (`provider: 'adsense'`) merender unit nyata:
  `<ins class="adsbygoogle" data-ad-client data-ad-slot>` plus loader
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`
  via `AdSensePush` (`src/modules/ads/adsense-push.tsx`, komponen klien
  kecil: `useEffect` mendorong `(window.adsbygoogle || []).push({})`,
  skrip dimuat dengan `next/script` `afterInteractive`).
- CSP edge (`src/proxy.ts`, `adsenseCspHosts()`) membuka `script-src`
  untuk `pagead2.googlesyndication.com` dan `googleads.g.doubleclick.net`,
  serta `frame-src` untuk `googleads.g.doubleclick.net` dan
  `tpc.googlesyndication.com`; direktif lain tidak dilonggarkan.
- Batasan: `clientId` wajib — tanpa `clientId` (atau hanya spasi),
  `AdProvider` merender null (wadah cadangan slot tetap dipertahankan,
  tanpa markup iklan); `slotId` opsional, absen berarti unit responsif
  tanpa `data-ad-slot`.

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
Slot **mati secara bawaan** dan hanya tayang setelah switch dasbor
dinyalakan per slot per situs (atau penempatan aktif memasok kreatif —
itu dihitung sebagai opt-in eksplisit).
Seluruh tulis berversi (konflik → 409 + muat ulang) dan tercatat di
`audit_logs` dalam transaksi yang sama. Setiap mutasi sukses memanggil
`revalidateTag(org:…)` agar halaman publik yang ter-cache langsung segar.

### Operasi ubah & hapus

Selain create/status, dasbor menyediakan `*.update` (pengiklan, kampanye,
kreatif per-jenis, penempatan) dan `*.delete` (keempatnya) via action map
yang sama. Ubahan memakai cek versi optimistis (`version = expectedVersion`,
baris tak cocok → 409). Hapus adalah hard delete satu baris tanpa
select-then-delete; bila FK `restrict` menahan (mis. pengiklan masih dipakai
kampanye) error `23503` dipetakan ke konflik 409 berpesan jelas. Setiap
mutasi menulis satu baris `audit_logs` dalam transaksi yang sama.

### Unggah gambar kreatif (`ads.creative.upload`)

Form Kreatif (jenis gambar) menyediakan input berkas di samping URL: berkas
dipilih → `POST` multipart ke `/api/dashboard/ads` (`organizationId`,
`action`, `file`, plus `campaignId`/`href`/`alt` opsional) → URL publik
terisi otomatis dari `{id, imageUrl}` beserta pratinjau kecil. Batas:
MIME `image/*`, ≤5MB, sisi ≤4096px (dimensi dibaca via `sharp` tanpa
konversi — bytes asli disimpan agar rasio kreatif pengiklan utuh; tanpa
thumbnail turunan).

Berkas mendarat di bucket publik dengan key
`pub/o/{org}/p/ad-creative/{uuid}.{ext}` → URL
`https://{R2_PUBLIC_HOST}/{key}`. Sengaja **tanpa baris `media`**:
purpose `ad-creative` tidak ada di `MEDIA_PURPOSES` dan CHECK
`media_owner_prefix` hanya menerima aset organisasi di
`o/{org}/p/%/organization/%`, sehingga key di atas tak bisa lolos tanpa
migrasi — `imageUrl` R2 langsung disimpan di `ad_creatives` (kind `image`,
`width`/`height` asli). Urutan tulis: PUT R2 dulu, lalu satu transaksi
DB (`ad_creatives` + `audit_logs`); bila transaksi gagal, objek R2 dihapus
lagi (`deleteExact`, best-effort). Tanpa `R2_PUBLIC_HOST` aksi gagal
fail-closed (503): tanpa host publik dan tanpa baris media tak ada jalur
sajian. Gate memakai `site.manage` yang sama seperti action lain.

## Ketahanan yang diaudit

- Jendela kampanye (`campaigns.starts_at/ends_at`) ditegakkan di read path,
  bukan hanya status; slot yang dinonaktifkan di katalog (`ad_slots.active`)
  tidak tayang walau ada penempatan.
- URL klik `javascript:` ditolak di validator, skema dasbor, dan normalisasi
  string kosong → null; HTML kreatif tetap di batas peran tepercaya.
- Race insert switch situs (duplikat PK) dipetakan ke konflik 409, bukan 500.
- Kreatif gambar berdimensi memakai rasio aspeknya sendiri sehingga ruang
  cadangan sama persis dengan hasil render (nol CLS).
- Penargetan perangkat dihentikan: baris penempatan ber-scope perangkat
  dilewati di render server (tanpa sinyal perangkat tepercaya), skema API
  menolak penempatan ber-scope perangkat baru, dan dasbor tidak lagi
  menawarkan pilihannya — gunakan slot khusus perangkat
  (`mobile-banner`, `sidebar-*`). Kolom `device` dipertahankan baca-saja
  untuk baris warisan.

## Batasan tahap ini

- Kreatif `html` berasal dari konfigurasi tepercaya (dasbor harus
  membatasi ke peran tepercaya); tidak ada sanitasi markup di render.
- Kreatif `provider` (AdSense) merender unit penuh — lihat
  [AdSense penuh](#adsense-penuh).
- Tanpa dasbor admin (tulis kampanye/penempatan) dan tanpa beacon
  impresi/klik (rencana: mengikuti pola `ViewBeacon`); tabel baca
  (`tenant_ad_settings`, `ad_placements`) sudah live di read path.

## Verifikasi

- `npm run typecheck`, `npm run lint` (`--max-warnings=0`), dan seluruh
  suite vitest hijau, termasuk 152 uji di `src/modules/ads` dan uji wiring
  `tenant_ad_settings` di `src/data/repos/delivery.test.ts`.
- Cakupan uji: katalog slot, validasi kreatif, peta 10 template,
  prioritas konfigurasi, pemetaan baris DB, render null saat dinonaktifkan/tak dipetakan/
  template asing, unit AdSense (`ins.adsbygoogle` + loader klien),
  tanpa lebar tetap, label iklan terlihat, penolakan penargetan perangkat,
  satu spanduk ponsel per halaman (`page-ad-single.test.tsx`), dan
  `in-feed` pencarian di semua template.
