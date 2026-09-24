# Arsip docs Vercel multi-tenant platforms

> Status: arsip verbatim untuk referensi internal, diambil 2026-09-24.
> Sumber upstream: <https://vercel.com/docs/platforms/multi-tenant-platforms>
> Yang berlaku bila konflik: docs upstream + `docs/architecture.md` (code wins).

Indicate memakai pola yang sama: satu codebase + satu deployment Vercel melayani banyak tenant via `src/proxy.ts` dan `HostnameResolver` (`src/modules/delivery/hostname-resolver.ts`). Beda utama: Indicate memakai exact-hostname lookup ke Postgres (bukan Global Config), nameserver masih Cloudflare.

## Isi arsip

| File | Sumber |
|---|---|
| [overview](overview.md) | `/docs/platforms/multi-tenant-platforms` (last_updated 2026-07-28) |
| [concepts](concepts.md) | `/concepts` (2026-08-20) |
| [quickstart](quickstart.md) | `/quickstart` (2026-09-15) |
| [configuring-domains](configuring-domains.md) | `/configuring-domains` (2026-09-16) |
| [custom-subpaths](custom-subpaths.md) | `/custom-subpaths` (2026-06-26) |
| [middleware-and-routing](middleware-and-routing.md) | `/middleware-and-routing` (2026-08-10) |
| [serving-static-files](serving-static-files.md) | `/serving-static-files` (2026-08-11) |
| [preview-url-prefixes](preview-url-prefixes.md) | `/preview-url-prefixes` (2026-07-28) |
| [reference](reference.md) | `/reference` (2026-09-03) |
| [limits](limits.md) | `/limits` (2026-09-08) |

## Catatan relevan untuk Indicate

- Wildcard `*.apex` wajib nameserver Vercel (atau delegasi `_acme-challenge` ke Vercel bila DNS eksternal) — lihat `configuring-domains.md`.
- Pro = custom domain Unlimited dengan soft limit 100.000/project; Hobby = 50 — lihat `limits.md` dan `reference.md`. Project `indicate` di team Pro `safenca` kini 222 domain (118 exact + 104 wildcard), 0 unverified — penolakan limit masa trial sudah basi.
- Rate limit API: add 100/jam, verify 50/jam, remove 100/jam per team.
- Preview URL multi-tenant (`tenant---branch`) dan custom SSL = Enterprise only.
- Header `x-tenant-*` wajib di-strip/di-overwrite di proxy agar tidak bisa dipalsukan client — pola ini sudah dipakai `src/proxy.ts`.
