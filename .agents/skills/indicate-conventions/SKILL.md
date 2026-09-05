---
name: indicate-conventions
description: Conventions for the Indicate multi-tenant media syndication codebase (Next.js 16 App Router, Supabase Postgres + Drizzle ORM, Cloudflare DNS/R2, Upstash Redis). Use this skill whenever writing, editing, reviewing, or planning code in the Indicate repository — product modules, provider integrations, Drizzle schema or migrations, App Router routes, or UI work — even when the request does not name it. Encodes the hexagonal layout, multi-tenant and RLS invariants, the forward-only migration workflow, and the docs/DESIGN.md visual contract.
---

# Indicate Conventions

Indicate is a multi-tenant media syndication platform: one Next.js application, one Supabase Postgres database, one private Cloudflare R2 bucket, and one Upstash Redis resource serve every news portal tenant and hostname.

## Read first

Load the relevant reference before acting, and treat these repo docs as authoritative when they conflict with this skill:

- `CLAUDE.md` — tech stack, App Router conventions, commands, security invariants.
- `docs/ARCHITECTURE.md` — the 12 architectural invariants and system topology (single Vercel project, Cloudflare DNS authority, durable-Postgres-first design).
- `docs/MIGRATIONS.md` — migration promotion gate and Supabase roles.
- `docs/DESIGN.md` — the visual contract (note: `CLAUDE.md` still points at `DESIGN.md` at root; the real file is `docs/DESIGN.md`).
- `.env.example` — authoritative contract for currently implemented environment variables.

Detailed guidance lives in `references/`: `architecture.md`, `tenancy-security.md`, `database.md`, `design.md`.

## Architecture and layout

Hexagonal / ports-and-adapters modular monolith under `src/`. Dependency direction: `app/` → `modules/` → `core/` + ports ← `integrations/`, with `data/` for persistence.

- `src/app/` handles Next.js App Router concerns only (route groups `(site)`, `(network)`, `(auth)`, `(dashboard)`, `api/`, `_composition/`, `_lib/`). Delegate all business logic to `src/modules/` and `src/data/`.
- `src/modules/` (`auth`, `billing`, `content`, `dashboard`, `delivery`, `integrations`, `persisted-config`, `publishing`, `site`) encapsulates product capabilities. Only `dashboard`, `delivery`, and `integrations` expose a barrel `index.ts` — import other modules by file path, never by bare module specifier.
- `src/integrations/` holds provider adapters (`supabase`, `storage`, `redis`, `telegram`, `cloudflare`, `vercel`) and stays server-only (`server-only` import at the top).
- `src/core/` is the shared kernel (`config/`, errors, operation context, hostname, observability, routing, security, system, transactions).
- `src/data/` holds the Drizzle schema (`schema/`), client factory, repository implementations, and hand-written SQL migrations (`migrations/`).
- Path aliases: `@/*` → `./src/*`, plus `@/components/*`, `@/modules/*`, `@/data/*`, `@/core/*`, `@/integrations/*`, `@/ui/*`.
- Dashboard, API, Telegram, background, and reconciliation adapters must invoke shared application services — never issue tenant SQL directly or reimplement business rules.
- External effects (purge, DNS, Telegram sends) happen only after durable intent is recorded in Postgres, and must be resumable, bounded, and idempotent.

## Multi-tenancy (non-negotiable)

`proxy.ts` (Next.js 16 proxy convention, not `middleware.ts`) routes by hostname: Dashboard host, API host, webhook host, or one public tenant host.

- A normalized hostname resolves only by exact equality to one reserved control-plane surface or one unique active Site. No fallback tenant exists; suffix-only or substring-only matching is forbidden.
- Every tenant operation derives exactly one authorized `organizationId`. Public reads resolve Organization and Site from one exact normalized hostname.
- Canonical article content exists once; `article_sites` stores destination assignment and outcome without copying title or body.
- Cache namespaces, SEO, media authorization, and analytics attribution all derive from the same Hostname Context.

## Database and migrations

- Drizzle ORM with PostgreSQL dialect. Schema in `src/data/schema/` (`editorial`, `identity`, `operations`, `runtime-config`).
- Migrations are forward-only SQL in `src/data/migrations/`, applied manually in the order recorded by `meta/_journal.json` with the direct credential (`DATABASE_DIRECT_URL`); runtime traffic uses the pooled URL with prepared statements disabled. There are no `db:*` npm scripts.
- Schema evolution follows expand → backfill → verify → contract across compatible releases. Never drop a column/table in the same release that stops writing it; fix failed migrations with a new forward migration, never by editing metadata.
- RLS is enforced at the PostgreSQL level with the dedicated non-owner, non-`BYPASSRLS` `indicate_runtime` role. Audit logs are insert-only (no update/delete).
- After migration work, verify via `GET /api/health` (reports configuration validity and the Postgres snapshot version). The fail-closed schema-version gate (`migration_gate_events.required_version`) is evaluated at runtime-context initialization, not in the health handler.

## Configuration and security

- Environment schema in `src/core/config/runtime/runtime-schema.ts` is Zod-validated and fail-closed: missing or malformed values block activation rather than falling back.
- Secrets stay in server-only environment storage. Never put secrets, tokens, or internal diagnostics in browser bundles, logs, fixtures, or error responses. Deny missing/malformed/unauthorized inputs without disclosing internals.
- Supabase Auth supplies session identity only; authorization lives in local Membership/Role/Permission data.

## Naming and commands

- Files `kebab-case.ts(x)`; components, types, and interfaces `PascalCase`; functions and variables `camelCase`; constants `UPPER_SNAKE_CASE`.
- Commands: `npm run dev`, `npm run build`, `npm run start`, `npm run typecheck` (`tsc --noEmit`), `npm run lint` (ESLint, `--max-warnings=0`). Run `typecheck` and `lint` after code changes.
- `next.config.ts` keeps `postgres` and `drizzle-orm` in `serverExternalPackages`; image `remotePatterns` are a tenant allowlist — unknown hosts stay rejected.

## Infrastructure split

- Cloudflare is authoritative for nameservers, DNS, wildcard records, edge TLS proxying, and CDN (Full strict). Vercel provides hosting and exact custom-domain association only — never transfer nameserver control, never register wildcard domains on Vercel.
- One private R2 bucket accessed via the S3-compatible API (`*.r2.cloudflarestorage.com`); no public buckets, no per-tenant buckets. Media is served through signed, short-lived authorizations (`r2:` key prefix), never direct bucket URLs.
- Upstash Redis coordinates publication dispatch, leases, rate limits, idempotency acceleration, and cache invalidation. Redis is a recoverable projection of durable Postgres intent — never the sole record.

## UI and design

All visual decisions follow `docs/DESIGN.md` (dark indigo control-room aesthetic, brass accent, Fraunces + Plex type system, exact-number reporting, small radii, anti-slop rules). If a needed pattern is not in that document, extend the document first — do not improvise in code. shadcn/ui components live in `src/components/ui/` per `components.json`.
