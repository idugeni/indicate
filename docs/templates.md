# Tenant templates

> **Status:** Advisory.
> **Owner:** Platform team.
> **Source of truth:** `src/modules/site/components/network/templates/` (dispatcher: `src/modules/site/components/network/network-listing.tsx`).
> **Related:** [architecture](architecture.md) · [architecture rules](architecture-rules.md)

Sepuluh template hidup di `src/modules/site/components/network/templates/`:
`clean-blue` + 9 varian (`black-lime`, `dark-navy`, `glassy-blue`,
`green-minimal`, `orange-modern`, `purple-editorial`, `red-editorial`,
`soft-blue`, `warm-editorial`). Semua duplikat pola modular `clean-blue/`.
Route `(network)` tidak mengenal nama template — semua lewat dispatcher di
`src/modules/site/components/network/network-listing.tsx`. Loader berbrand
justru pengecualian: ia butuh `templateId` **sebelum** situs ter-resolve,
jadi `resolveTenantBranding()` membacanya sendiri satu skalar.

## Dispatcher (registry saat template baru lahir)

`ListingPage`, `ArticlePage`, `LegalPage`, `AboutPage`, `ContactPage`,
`SearchPage`, `ReportPage`, `NotFoundPage`, `ChannelPage` — semua resolve via
`normalizeTemplateId(...)` + `switch` langsung ke komponen per-template di
`src/modules/site/components/network/network-listing.tsx` dengan fallback
`clean-blue`. Pengecualian sadar: `(network)/loading.tsx` tetap satu loader
netral — boundary Suspense tidak punya konteks Site, jadi loader per-template
 mustahil secara arsitektur.

## Struktur per-template (modular, contoh `clean-blue/`)

```text
<id>/
  theme.ts                       # palet mandiri (bukan site_settings.colors)
  lib/format.ts, lib/nav.ts      # pure helpers (tanggal/views/baca/nav)
  server/site-nav.ts             # navigasi kategori cached, server-only
  chrome/                        # shell, site-header, header-bar, search-panel,
                                 # mobile-sidebar, site-nav-menu, site-footer,
                                 # store-badges, back-to-top
  ui/                            # container, status-line, empty, author-avatar,
                                 # article-meta, section-heading,
                                 # <id>-input, <id>-button, loader
  seo/json-ld.tsx                # JSON-LD mandiri template
  cards/                         # hero, ticker, picks, pick-card, archive-pager,
                                 # newsletter, hero-actions, share-buttons, view-beacon
  pages/                         # 8 halaman + search-form + report-form
```

Varian visual: `black-lime` + `dark-navy` dark penuh; `red-editorial` +
`warm-editorial` heading serif; sisanya sans terang dengan primer masing-masing.

Footer seragam di sepuluh template: grid
`lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]`
dengan blok brand (logo, nama, tagline, deskripsi, sosial, tombol sumber
pilihan) di kolom pertama, lalu `Kategori`, `Tentang Kami`, dan
`Aplikasi Mobile` (`store-badges`). `ABOUT_LINKS` hanya boleh menunjuk rute
tenant yang benar-benar ada — `Profil`, `Kontak`, `Kebijakan Privasi`,
`Syarat & Ketentuan`.

Di bawah `sm` blok brand jadi satu kolom penuh rata tengah dengan urutan
vertikal: logo, nama, tagline, deskripsi, sosial, tombol sumber pilihan.
Logo dan nama turun dari baris mendatar ke tumpukan lewat
`flex-col … sm:flex-row`, jadi jangan hanya memusatkan teks — `items-center`
pada pembungkus brand dan `justify-center` pada baris sosial wajib ikut,
atau tombol `inline-flex` di dalamnya tidak ikut ke tengah.

Tidak ada strip kanal terpisah di header. Navigasi kategori punya tepat dua
wajah: ponta desktop `hidden lg:flex` dan hamburger `lg:hidden` yang membuka
drawer berisi seluruh kanal (ditutup "Indeks"). Keduanya bertemu di `lg`,
jadi `lg` tetap satu breakpoint — jangan pernah membuat hamburger atau
desktop nav punya batas sendiri, atau rentang `sm`–`lg` kehilangan seluruh
navigasi kategori. Strip geser horizontal (`CategoryNavStrip`) pernah duduk
di antara keduanya dan sengaja dihapus: ia menambah affordance kedua di
mobile tanpa menambah jangkauan kanal. Kalau kanal perlu cepat dijangkau
di layar kecil, perbaiki drawer, jangan tambah strip.

## Urutan kanal (invariants, bukan preferensi per template)

1. **Navigasi eksplisit** (`site.settings.navigation`) dipakai apa adanya —
   inilah satu-satunya cara operator mengatur urutan nav.
2. **Baca `categories`** lalu urut A–Z stabil (`localeCompare(…, 'id')`, slug
   sebagai pemutus nama sama). `limit` ikut di `keyParts` cache dan ada plafon
   bersama: semua limit ≤ `CATEGORY_NAV_LIMIT` membaca satu entri lalu dipotong
   di memori, jadi header (7) dan footer (6) tidak menambah round-trip.
3. **Fallback** `categoryNav()` hanya saat tabel `categories` kosong/gagal.

**Dilarang** memakai `site.articles` sebagai peringkat kanal: field itu hanya
memuat artikel halaman yang sedang dirender, bukan seluruh tenant. Dipakai
sebagai urutan, nav bergeser tergantung halaman mana yang pertama mengisi cache
24 jam; dipakai sebagai filter, `/indeks` menyembunyikan kanal berartikel dan
melaporkan jumlah artikel yang jauh di bawah kenyataan. Karena itu
`categoryFrequencyRank` dihapus — `/indeks` kini menampilkan seluruh kanal
aktif tanpa klaim jumlah artikel. Butuh jumlah artikel asli? Tambahkan
aggregate SQL-nya secara eksplisit, jangan menebak dari data halaman.

Ekstra per-template (di luar pola dasar): `chrome/top-bar.tsx` (strip tanggal +
info, semua kecuali `clean-blue`, `black-lime`, `dark-navy`, `red-editorial`);
`cards/category-pills.tsx` + `cards/latest-news.tsx` (`glassy-blue`);
`cards/latest.tsx` (list editorial + panel perspektif: `orange-modern`,
`green-minimal`, `warm-editorial`, `purple-editorial`, `dark-navy`);
`cards/most-read.tsx` (nomor + thumbnail: `black-lime`, `dark-navy`);
`columns={4}` di `cards/picks.tsx` (`black-lime`, `orange-modern`);

Headline berputar `cards/ticker.tsx` ada di **tujuh** template:
`black-lime`, `dark-navy`, `glassy-blue`, `clean-blue`, `green-minimal`,
`orange-modern`, `soft-blue`. Semuanya berbagi `useTickerRotation` dari
`network/ui/ticker-rotation.ts` — rotasi 5 detik, maks 5 headline, jeda
saat hover/fokus/tab tersembunyi, swipe ≥40px, dan grace period 700px
setelah `touchend` agar iOS tidak nempel paused. Ketiga editorial
(`purple-editorial`, `red-editorial`, `warm-editorial`) tidak punya
headline berputar — keputusan sadar, jadi jangan menambah
`cards/ticker.tsx` tanpa merendernya di `pages/listing-page.tsx`.
tombol `Langganan` (`#newsletter`) di `chrome/header-bar.tsx` semua kecuali
`clean-blue` + `black-lime` (contoh NOVA tanpa tombol langganan).
Tautan top-bar hanya ke rute tenant yang ada (`/tentang`, `/kontak`) —
`Redaksi` menunjuk `/tentang`; tidak ada rute `/redaksi`, `/karir`,
`/pedoman-media` (butuh `RESERVED_ARTICLE_SLUGS` bila kelak ditambah).

Dinamis, bukan hardcode: quote panel Perspektif memakai
`site.settings.tagline ?? site.settings.description` (`black-lime`,
`orange-modern`, `purple-editorial`, `warm-editorial`); hero `red-editorial`
(01/02/03), `dark-navy` (dots), `glassy-blue` (counter + panah) adalah
carousel sungguhan — rotasi otomatis 6 detik, jeda saat hover/fokus,
hormat `prefers-reduced-motion`, semua indikator bisa diklik.
`Paling Banyak Dibaca` diurut `viewCount` menurun.

Aturan: impor lintas direktori wajib `@/`; tanpa barrel `index.ts`
(mengikuti konvensi modul `site`); kontrol form/table-tema lewat
`network/ui/` bersama - `templateThemeStyle()` di root shell +
`TemplateInput`/`TemplateTextarea`/`TemplateSelect`/`TemplateButton`
yang membaca variabel `--tpl-*`. Jangan pakai `Input`/`Button`/
`Textarea` shadcn langsung maupun elemen form native tanpa gaya:
semua warna datang dari variabel tema (kebal root `<html
class="dark">` permanen), bentuk dari pemanggil. Pengecualian sadar:
titik indikator carousel/ticker (tanpa padanan shadcn) dan daftar
buka-tutup `<select>` bawaan OS.

Palet marketing tiap template (`theme.ts`: clean-blue `#1a5fd0`,
red-editorial `#b91c1c`, dst.) disengaja terang dan mandiri — bukan
remap ke token dashboard gelap (`globals.css` `--bg`/`--brass`/`--paper`).
Gambar tenant memakai `unoptimized` tanpa syarat di kartu hero/article
(plus saklar global `images.unoptimized` di `next.config.ts`): nol biaya
transformasi Vercel.

`clean-blue`. Pengecualian sadar: `(network)/loading.tsx` **juga** memuat
loader berbrand, karena ia ikut me-resolve branding sendiri.

## Loader berbrand (bukan lagi satu loader netral)

Loader lama sudah mati: `TemplateLoader` di `network-listing.tsx` tidak pernah
dirender, 10 `templates/*/ui/loader.tsx` menggantungkan diri padanya, dan
`network/ui/ring-loader.tsx` menggantungkan diri pada 10 file itu. 12 file
reachable-nol.

Sekarang: `resolveTenantBranding()` (`modules/delivery/tenant-branding.ts`)
membaca **satu skalar** `site_settings.template_id` (generated column, bukan
blob `colors`) lewat `loadSiteTemplateId`, cache 24 jam, tag `host:`/`site:`/
`org:`. Logo **nol query**: `/logo.png` adalah rute deterministik per host
(`https://<host>/logo.png`). Lima route `(network)` hoist branding ke atas
boundary lalu merender `TemplateLoader` sebagai `fallback`; `branding === null`
turun ke `RootLoading`.

`BrandedLoader` (`network/ui/branded-loader.tsx`) menampilkan logo tenant dalam
lingkaran dengan dua cincin berlawanan arah, background dari `--tpl-canvas`, dan
**tanpa teks terlihat** — nama aksesibel datang dari `aria-label`, sedangkan
seluruh subtree visual diberi `aria-hidden`. Putaran pakai
`motion-safe:animate-[…]` + `motion-reduce:animate-none` dengan `@keyframes
brand-ring-cw`/`brand-ring-ccw` di `globals.css`; aturan global
`prefers-reduced-motion` hanya memaksa *duration*, jadi tanpa `animate-none`
cincin membeku pada sudut acak, bukan berhenti.

`RootLoading` (`src/app/loading.tsx`) kini benar-benar netral: `bg-bg`/`text-paper`
saja, cincin `currentColor`, nol hex. Dipakai hanya saat host bukan tenant aktif
atau baca branding gagal. `(dashboard)`, `(site)`, dan `status/` punya
`loading.tsx` sendiri; `(auth)` sekarang juga punya, kalau tidak ia berkedip
indigo gelap sebelum krem-nya ter-cat.

Yang **tidak** berubah: 10 route `(network)` tetap Partial Prerender. `await`
di atas boundary tidak menurunkan statusnya.

## Tiga registry (wajib kompak)

1. `TEMPLATE_IDS` (`templates/listing-shared.tsx`) — kebenaran dispatch runtime.
2. `MASTER_TEMPLATE_PRESETS` (`src/ui/themes.ts`) — validasi dashboard.
3. `template_presets` (DB) — katalog dashboard + seed migration.

## Checklist template baru

1. Duplikat pola `clean-blue/` (chrome, 8 halaman di `pages/`, loader di `ui/`).
2. Tambah entri di registry `network-listing.tsx` + 3 registry di bawah + seed migration.
3. `RESERVED_ARTICLE_SLUGS` (`modules/dashboard/schemas.ts`) untuk tiap path
   statis baru — dan untuk tiap path control-plane yang bocor ke host tenant.
4. Sitemap/invalidasi/robots bila ada path baru; footer bila ada link baru.
5. Matriks render: tiap host tenant × tiap halaman (200 + canonical host
   sendiri), host dashboard × halaman control-plane tetap 200, slug cadangan
   308/404 sesuai `src/proxy.ts` (`TENANT_ALIASES`/`TENANT_GONE`).

## Catatan

- `templateId` menumpang di `site_settings.colors` (JSONB), disurfaced via kolom generated `template_id` dengan FK ke `template_presets(id)` (`20260920050000_site_settings_template_fk.sql`): id tak dikenal ditolak saat tulis; kolom writable dedicated masih tertunda.
- SEO, sitemap, RSS, invalidasi, dan copy legal bersama tetap
  template-agnostic di `modules/site/` dan `modules/delivery/`.
