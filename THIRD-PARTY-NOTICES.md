# Third-Party Notices

This repository is licensed under the [Apache License 2.0](LICENSE) (Copyright 2026 Eliyanto Sarage).
This file records upstream attributions required by permissive licenses and
documents nominative trademark use. It does not modify any license.

## UI toolkits (MIT)

- Radix UI primitives (`@radix-ui/*`) — MIT © Radix UI authors. Used via `src/components/ui/*`.
- Base UI (`@base-ui/react`) — MIT © MUI. Used as headless primitives under `src/components/ui/*`.
- shadcn/ui — MIT © shadcn. Component patterns vendored into `src/components/ui/*`.
- `class-variance-authority`, `clsx`, `tailwind-merge` — MIT/Apache-2.0, see `package-lock.json`.
- `cmdk`, `embla-carousel-react`, `vaul`, `sonner`, `input-otp` — MIT.
- `react-icons` — MIT © react-icons contributors. No third-party brand glyphs are rendered; the Google sign-in button uses text only.
- `react-day-picker`, `recharts` — MIT.

## Icons and fonts

- Lucide (`lucide-react`, ISC © Lucide contributors) — configured as icon library in `components.json`.
- Fraunces + IBM Plex Sans/Mono via `next/font/google` — SIL Open Font License 1.1. Fonts are fetched at build time, not vendored. If `*.woff2` files are ever vendored, include the OFL text and copyright notices alongside them.

## Data and infrastructure clients

- `drizzle-orm` — Apache-2.0. `postgres` (porsager/postgres) — Unlicense.
- `@supabase/ssr`, `@supabase/supabase-js` — MIT.
- `@upstash/redis` — MIT. `@aws-sdk/*` — Apache-2.0. `zod` — MIT.

## Transitive copyleft (attribution only; no repo modification)

- `sharp` / `@img/sharp-libvips-*` (via Next.js image optimization) — LGPL-3.0-or-later. Used unmodified as a build/runtime library; recipients may replace the library and must receive a copy of the LGPL. Source manifest: `package-lock.json`.
- `lightningcss` (via Tailwind CSS 4), `axe-core` — MPL-2.0. Used unmodified; MPL source obligations apply only to modified MPL files, of which this repo contains none.

## Trademarks

Google, Cloudflare, Vercel, Supabase, Upstash, Telegram, PostgreSQL, Next.js, and React are trademarks of their respective owners. Mention in docs and code is nominative (to describe origin and integration) and implies no endorsement or affiliation, consistent with Apache-2.0 §6.
