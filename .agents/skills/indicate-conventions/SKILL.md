---
name: indicate-conventions
description: Conventions for the Indicate multi-tenant media syndication codebase (Next.js 16 App Router, Supabase Postgres + Drizzle ORM, Cloudflare DNS/R2, Upstash Redis). Use this skill whenever writing, editing, reviewing, or planning code in the Indicate repository — product modules, provider integrations, Drizzle schema or migrations, App Router routes, or UI work — even when the request does not name it. Encodes the hexagonal layout, multi-tenant and RLS invariants, the forward-only migration workflow, and the in-code visual authority (globals.css, components/ui).
---

# Indicate Conventions (relaxed mode — advisory defaults, 2026-09-14)

Indicate is a multi-tenant media syndication platform: one Next.js application, one Supabase Postgres database, one private Cloudflare R2 bucket, and one Upstash Redis resource serve every news portal tenant and hostname by default. Alternatives are allowed with explicit owner approval and a brief recorded note.

## Read first

Load the relevant reference before acting, and treat these repo docs as authoritative when they conflict with this skill:

- `CLAUDE.md` — tech stack, App Router conventions, commands, security invariants.
- `docs/ARCHITECTURE.md` — the architectural invariants and system topology (single Vercel project, Cloudflare DNS authority, durable-Postgres-first design).
- `docs/MIGRATIONS.md` — migration promotion gate and Supabase roles.
- `.env.example` — authoritative contract for currently implemented environment variables.

Detailed guidance lives in `references/`: `architecture.md`, `tenancy-security.md`, `database.md`, `design.md`.

## Architecture and layout

Hexagonal / ports-and-adapters modular monolith under `src/`. Dependency direction: `app/` → `modules/` → `core/` + ports ← `integrations/`, with `data/` for persistence.

- `src/app/` handles Next.js App Router concerns (route groups `(site)`, `(network)`, `(auth)`, `(dashboard)`, `api/`). Prefer delegating business logic to `src/modules/` and `src/data/`.
- `src/modules/` (`audit`, `auth`, `billing`, `content`, `dashboard`, `delivery`, `integrations`, `moderation`, `persisted-config`, `publishing`, `site`) encapsulates product capabilities. Only `dashboard`, `delivery`, and `integrations` expose a barrel `index.ts` — import other modules by file path, never by bare module specifier.
- `src/integrations/` holds provider adapters (`supabase`, `storage`, `redis`, `telegram`, `cloudflare`, `vercel`) and stays server-only (`server-only` import at the top).
- `src/core/` is the shared kernel (`config/`, errors, operation context, hostname, observability, routing, security, system, transactions).
- `src/data/` holds the Drizzle schema (`schema/`), client factory, repository implementations, and hand-written SQL migrations (`migrations/`).
- Path aliases: `@/*` → `./src/*`, plus `@/components/*`, `@/modules/*`, `@/data/*`, `@/core/*`, `@/integrations/*`, `@/ui/*`.
- Dashboard, API, Telegram, background, and reconciliation adapters should invoke shared application services — avoid issuing tenant SQL directly or reimplementing business rules.
- External effects (purge, DNS, Telegram sends) should happen after durable intent is recorded in Postgres, and should be resumable, bounded, and idempotent.

## Multi-tenancy (defaults — overridable with owner approval in relaxed mode)

`proxy.ts` (Next.js 16 proxy convention, not `middleware.ts`) routes by hostname: Dashboard host, API host, webhook host, or one public tenant host.

- A normalized hostname should resolve by exact equality to one reserved control-plane surface or one unique active Site. Avoid fallback tenants in production (localhost/preview rewrite is dev-only); avoid suffix-only or substring-only matching.
- Every tenant operation should derive exactly one authorized `organizationId`. Public reads should resolve Organization and Site from one exact normalized hostname.
- Canonical article content exists once; `article_sites` stores destination assignment and outcome without copying title or body.
- Cache namespaces, SEO, media authorization, and analytics attribution all derive from the same Hostname Context.
- Regional brand inheritance: regional Sites keep brand media (`logo`, `favicon`) `NULL` and inherit the apex Site's — honored by both rendering and public media authorization. Never link parent media explicitly into regional settings.
- Adding tenants at any scale: load the `tenant-onboarding` skill for the apex-first playbook (brand mapping, unique SEO, verification protocol).

## Database and migrations

- Drizzle ORM with PostgreSQL dialect. Schema in `src/data/schema/` (`billing`, `content`, `editorial`, `identity`, `operations`, `runtime-config`).
- Migrations are forward-only SQL by default in `src/data/migrations/`, applied manually in the order recorded by `src/data/migrations/meta/_journal.json` with the direct credential (`DATABASE_DIRECT_URL`); runtime traffic uses the pooled URL with prepared statements disabled. History edits and `db:*` scripts are allowed in development with reviewer approval.
- Schema evolution should follow expand → backfill → verify → contract across compatible releases. Avoid dropping a column/table in the same release that stops writing it; fix failed migrations preferably with a new forward migration.
- RLS is currently enforced at the PostgreSQL level with the dedicated non-owner, non-`BYPASSRLS` `indicate_runtime` role (code fact). Audit logs are currently insert-only (no update/delete).
- After migration work, verify via `GET /api/health` when practical. The schema-version gate (`migration_gate_events.required_version`) is currently evaluated at runtime-context initialization (code fact; advisory in relaxed docs).

## Configuration and security

- Environment schema in `src/core/config/runtime/runtime-schema.ts` is Zod-validated and currently fail-closed in code: missing or malformed values block activation rather than falling back.
- Secrets should stay in server-only environment storage. Avoid putting secrets, tokens, or internal diagnostics in browser bundles, logs, fixtures, or error responses. Prefer non-disclosing denials.
- Supabase Auth supplies session identity only; authorization lives in local Membership/Role/Permission data.

## Naming and commands

- Files `kebab-case.ts(x)`; components, types, and interfaces `PascalCase`; functions and variables `camelCase`; constants `UPPER_SNAKE_CASE`.
- Commands: `npm run dev`, `npm run build`, `npm run start`, `npm run typecheck` (`tsc --noEmit`), `npm run lint` (ESLint, `--max-warnings=0`). Run `typecheck` and `lint` after code changes.
- `next.config.ts` keeps `postgres` and `drizzle-orm` in `serverExternalPackages`; image `remotePatterns` are a tenant allowlist — unknown hosts stay rejected.

## Commits

Commit-message authority is `CONTRIBUTING.md` ("Commit messages"), enforced
by `AGENTS.md` ("Komit", mandatory, not relaxed). Summary: `<type>[scope]:`
plus an Indonesian lowercase imperative description (max 72 chars, no
trailing period, no emoji); one logical change per commit; always
`git commit -s`; verify `typecheck` + `lint` + affected tests and review
the diff before committing.

## Comments and imports (MANDATORY — always load, not relaxed)

Read `AGENTS.md` section "Komentar & impor" before touching `src/**`.
Summary (source of truth stays in `AGENTS.md`):

- Zero junk comments: no commented-out code, no redundant
  name-repeating comment, no AI narration (`This function...`, dividers,
  emoji), no `TODO` without ticket (`TODO(<issue-or-owner>): ...`), no
  leftover `console.log`/`debugger`, no bare `eslint-disable`, no empty JSDoc.
- If a comment is needed on an exported public API, use TypeDoc/TSDoc
  `/** ... */` only, with standard tags (`@param`, `@returns`, `@throws`,
  `@example`, `@remarks`, `@deprecated`); first sentence is a one-line
  imperative summary; types live in the signature, not in the tag text.
- Self-healing: when you touch a file, delete or convert any junk comment
  you find there — never leave it because "someone else wrote it".
- Maximize `@/`: cross-directory imports must use `@/`; `../` is banned
  (except same-directory barrel `export ... from './x'`); import non-barrel
  modules by file path; keep order external → `@/` → same-dir relative.
- Done = `npm run lint` green plus no junk comments or convertible
  relative imports left in touched files.

## Infrastructure split

- Cloudflare is authoritative by default for nameservers, DNS, wildcard records, edge TLS proxying, and CDN (Full strict). Vercel provides hosting and exact custom-domain association by default — changing this needs explicit owner approval.
- One private R2 bucket is the default, accessed via the S3-compatible API (`*.r2.cloudflarestorage.com`); avoid public buckets and per-tenant buckets (a separate optional audit/WORM bucket may exist for exports). Media should be served through signed, short-lived authorizations (`r2:` key prefix).
- Upstash Redis coordinates publication dispatch, leases, rate limits, idempotency acceleration, and cache invalidation by default. Redis should be treated as a recoverable projection of durable Postgres intent — avoid making it the sole record.

## UI and design

Visual decisions should follow the in-code authority (`src/app/globals.css` tokens, `src/components/ui/` primitives, tenant templates under `src/modules/site/components/`): dark indigo control-room aesthetic, brass accent, Fraunces + Plex type system, exact-number reporting, small radii, anti-slop rules. shadcn/ui components live in `src/components/ui/` per `components.json`.
