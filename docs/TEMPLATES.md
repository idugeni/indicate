# Tenant templates (advisory)

Sepuluh template hidup di `src/modules/site/components/network/templates/`:
`clean-blue` + 9 varian (`black-lime`, `dark-navy`, `glassy-blue`,
`green-minimal`, `orange-modern`, `purple-editorial`, `red-editorial`,
`soft-blue`, `warm-editorial`). Semua duplikat pola modular `clean-blue/`.
Route `(network)` tidak mengenal nama template — semua lewat dispatcher di
`src/modules/site/components/network/network-listing.tsx`.

## Dispatcher (registry saat template baru lahir)

`ListingPage`, `ArticlePage`, `LegalPage`, `AboutPage`, `ContactPage`,
`SearchPage`, `ReportPage`, `NotFoundPage`, `ChannelPage` — semua resolve via
`normalizeTemplateId(...)` + `switch` langsung ke komponen per-template di
`src/modules/site/components/network/network-listing.tsx` dengan fallback
`clean-blue`. Pengecualian sadar: `(network)/loading.tsx` tetap satu loader
netral — boundary Suspense tidak punya konteks Site, jadi loader per-template
 mustahil secara arsitektur.

## Struktur per-template (modular, contoh `clean-blue/`)

```
<id>/
  template.ts, theme.ts          # identitas + palet mandiri (bukan site_settings.colors)
  lib/format.ts, lib/nav.ts      # pure helpers (tanggal/views/baca/nav)
  server/site-nav.ts             # navigasi kategori cached, server-only
  chrome/                        # shell, site-header, header-bar, search-panel,
                                 # mobile-sidebar, site-nav-menu, site-footer,
                                 # store-badges, back-to-top
  ui/                            # container, status-line, empty, author-avatar,
                                 # article-meta, section-heading,
                                 # <id>-input, <id>-button, loader
  seo/json-ld.tsx                # JSON-LD mandiri template
  cards/                         # hero, ticker, picks, pick-card, load-more,
                                 # newsletter, hero-actions, share-buttons, view-beacon
  pages/                         # 8 halaman + search-form + report-form
```

Varian visual: `black-lime` + `dark-navy` dark penuh; `red-editorial` +
`warm-editorial` heading serif; sisanya sans terang dengan primer masing-masing.

Ekstra per-template (di luar pola dasar): `chrome/top-bar.tsx` (strip tanggal +
info, semua kecuali `clean-blue`, `black-lime`, `dark-navy`, `red-editorial`);
`cards/category-pills.tsx` + `cards/latest-news.tsx` (`glassy-blue`);
`cards/latest.tsx` (list editorial + panel perspektif: `orange-modern`,
`green-minimal`, `warm-editorial`, `purple-editorial`, `dark-navy`);
`cards/most-read.tsx` (nomor + thumbnail: `black-lime`, `dark-navy`);
`columns={4}` di `cards/picks.tsx` (`black-lime`, `orange-modern`);
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
(mengikuti konvensi modul `site`); tiap template mengunci terang/gelap via
`ui/<id>-input.tsx` + `ui/<id>-button.tsx` karena root
`<html class="dark">` permanen — jangan pakai `Input`/`Button` shadcn
langsung di template mana pun.

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
   308/404 sesuai `proxy.ts` (`TENANT_ALIASES`/`TENANT_GONE`).

## Catatan

- `templateId` masih menumpang di `site_settings.colors` (JSONB) — pindah ke
  kolom dedicated mengikuti expand→backfill→verify→contract (tertunda, 10
  template masih menumpang).
- SEO, sitemap, RSS, invalidasi, dan copy legal bersama tetap
  template-agnostic di `modules/site/` dan `modules/delivery/`.
