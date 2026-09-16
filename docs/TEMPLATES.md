# Tenant templates (advisory)

Satu-satunya template hidup: **Clean Blue Editorial** (`src/modules/site/components/network/templates/clean-blue/`).
Route `(network)` tidak mengenal nama template — semua lewat dispatcher di
`src/modules/site/components/network/network-listing.tsx`.

## Dispatcher (tambah `case` saat template baru lahir)

`ListingPage`, `ArticlePage`, `LegalPage`, `AboutPage`, `ContactPage`,
`SearchPage`, `ReportPage`, `NotFoundPage` — semua `switch
(normalizeTemplateId(site.settings.colors.templateId))` dengan fallback
`clean-blue`. Pengecualian sadar: `(network)/loading.tsx` tetap satu loader
netral — boundary Suspense tidak punya konteks Site, jadi loader per-template
 mustahil secara arsitektur.

## Tiga registry (wajib kompak)

1. `TEMPLATE_IDS` (`templates/listing-shared.tsx`) — kebenaran dispatch runtime.
2. `MASTER_TEMPLATE_PRESETS` (`src/ui/themes.ts`) — validasi dashboard.
3. `template_presets` (DB) — katalog dashboard + seed migration.

## Checklist template baru

1. Duplikat pola `clean-blue/` (shell, header, footer, 8 halaman, loader tetap).
2. Tambah `case` di 8 dispatcher + 3 registry + seed migration.
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
