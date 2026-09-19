# Orange Modern (oranye) — panduan modul

Satu dari sepuluh template tenant. Route `(network)` tidak mengenal nama
template — semua lewat registry di `network-listing.tsx`.

## Folder

- `template.ts`, `theme.ts` — identitas + palet mandiri (abaikan `site_settings.colors`).
- `lib/` — pure helpers, tanpa JSX: `format.ts`, `nav.ts`.
- `server/` — `site-nav.ts`, server-only + cache. Jangan diimpor komponen client.
- `chrome/` — rangka permanen: shell, header, search-panel, mobile-sidebar,
  nav-menu, footer, store-badges, back-to-top.
- `ui/` — primitif: container, status-line, empty, author-avatar,
  article-meta, section-heading, orange-modern-input, orange-modern-button, loader.
- `seo/` — JSON-LD mandiri.
- `cards/` — hero, ticker, picks, pick-card, load-more, newsletter,
  hero-actions, share-buttons, view-beacon.
- `pages/` — 8 halaman + `search-form` + `report-form`.

## Kontrak

1. Impor lintas direktori wajib `@/`, tanpa `../`. Tanpa barrel `index.ts`.
2. Template ini mengunci terang/gelap sendiri di bawah root `<html class="dark">` — form
   wajib pakai `ui/orange-modern-input.tsx` / `ui/orange-modern-button.tsx`,
   jangan `Input`/`Button` shadcn langsung.
3. Tambah halaman baru di `pages/`, daftarkan ke switch `network-listing.tsx`.
4. `lib/` tetap pure agar mudah diuji tanpa runner UI.
