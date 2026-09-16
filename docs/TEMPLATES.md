# Tenant templates (advisory)

Satu-satunya template hidup: **Clean Blue Editorial** (`src/modules/site/components/network/templates/clean-blue/`).
Route `(network)` tidak mengenal nama template — semua lewat dispatcher di
`src/modules/site/components/network/network-listing.tsx`.

## Dispatcher (registry saat template baru lahir)

`ListingPage`, `ArticlePage`, `LegalPage`, `AboutPage`, `ContactPage`,
`SearchPage`, `ReportPage`, `NotFoundPage` — semua resolve via
`resolvePages(normalizeTemplateId(...))` ke registry `CLEAN_BLUE_PAGES` di
`src/modules/site/components/network/network-listing.tsx` dengan fallback
`clean-blue`. Pengecualian sadar: `(network)/loading.tsx` tetap satu loader
netral — boundary Suspense tidak punya konteks Site, jadi loader per-template
 mustahil secara arsitektur.

## Struktur `clean-blue/` (modular)

```
clean-blue/
  template.ts, theme.ts          # identitas + palet mandiri (bukan site_settings.colors)
  lib/format.ts, lib/nav.ts      # pure helpers (tanggal/views/baca/nav)
  server/site-nav.ts             # navigasi kategori cached, server-only
  chrome/                        # shell, site-header, header-bar, search-panel,
                                 # mobile-sidebar, site-nav-menu, site-footer,
                                 # store-badges, back-to-top
  ui/                            # container, status-line, empty, author-avatar,
                                 # article-meta, section-heading,
                                 # clean-blue-input, clean-blue-button, loader
  seo/json-ld.tsx                # JSON-LD mandiri template
  cards/                         # hero, ticker, picks, pick-card, load-more,
                                 # newsletter, hero-actions, share-buttons, view-beacon
  pages/                         # 8 halaman + search-form + report-form
```

Aturan: impor lintas direktori wajib `@/`; tanpa barrel `index.ts`
(mengikuti konvensi modul `site`); UI terang dikunci via
`ui/clean-blue-input.tsx` + `ui/clean-blue-button.tsx` karena root
`<html class="dark">` permanen — jangan pakai `Input`/`Button` shadcn
langsung di template ini.

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
  kolom dedicated mengikuti expand→backfill→verify→contract saat template
  kedua dikerjakan, bukan sebelumnya.
- SEO, sitemap, RSS, invalidasi, dan copy legal bersama tetap
  template-agnostic di `modules/site/` dan `modules/delivery/`.
