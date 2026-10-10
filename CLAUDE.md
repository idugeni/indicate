# Indicate (conventions advisory; safety requirements remain binding)

Multi-tenant media syndication platform — one central Dashboard operating many news domains from a single shared deployment. This reference card relaxes conventions only; it does not relax security, compliance, tenant-isolation, data-integrity, or required CI gates. Deviations from ordinary conventions may be allowed with owner sign-off and a brief note.

> **This file is the reference card, not the rulebook.** It answers "where does
> this live" — route groups, path aliases, file naming, the commands, the config
> map. Every rule that binds a change lives in [`AGENTS.md`](AGENTS.md): comment
> hygiene, the `@/` import rule, database access and egress, commit format,
> unoptimized images, and the owner-override path. Do not restate a rule here.
> If this file and `AGENTS.md` ever disagree, `AGENTS.md` wins and this file is
> the one that gets corrected.
>
> Claims in this file are facts about the tree, so they rot silently. Verify
> before trusting: the Node version comes from `package.json` `engines` and
> `.nvmrc`, the aliases from `tsconfig.json` and `components.json`, the route
> tree from `src/app/`. The managed block at the end is written by `next dev`,
> not by hand.

## Tech stack

Exact pins live in `package.json`; the majors below are the contract.

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix |
| Language | TypeScript 6 (strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`) |
| Database | PostgreSQL 17 via Supabase, Drizzle ORM |
| Validation | Zod 4 |
| Object storage | Cloudflare R2 (private) |
| Cache/queue | Upstash Redis |
| Auth | Supabase Auth |
| Runtime | Node.js 24, ESM (`engines` + `.nvmrc` both pin 24) |

## Architecture

Hexagonal / ports-and-adapters modular monolith under `src/`. One application, one database, one deployment.

The architecture choices in [docs/architecture.md](docs/architecture.md) §2 are documented defaults that may be changed with owner approval where safe. This flexibility never permits bypassing security, compliance, tenant isolation, data integrity, or other hard safety requirements in `AGENTS.md`. When an approved change alters a non-safety default, record the reason in the same commit as a `Deviates:` trailer and update the section describing the old default.

**Dependency direction:**

```text
src/app/ → src/modules/ → src/core/ + ports ← src/integrations/
                                              ↘ src/data/ (persistence)
```

- `src/modules/` — Product capabilities, each with its own `ports.ts` interfaces where applicable. No I/O straight from callers: adapters invoke shared application services.
- `src/integrations/` — Concrete provider adapters: Supabase, R2 storage, Redis, Cloudflare, Vercel, email. Server-only.
- `src/core/` — Shared kernel: `config/`, errors, operation context, hostname, observability, routing, security, system, transactions.
- `src/data/` — Drizzle schema, client factory, repository implementations, migrations.
- `src/app/` — Purely routing (see below); business logic lives in `src/modules/` and `src/data/`.

## App Router conventions

All routes live under `src/app/` (there is no root-level `app/`).

### Route groups

```text
src/app/
├── (site)/     # Service landing and informational pages (Dashboard host only)
├── (network)/  # Tenant-facing public content (articles, categories, search)
├── (auth)/     # Authentication flows (sign-in, callback)
├── (dashboard)/# Protected editorial Dashboard
├── api/        # API routes (health, v1, dashboard, internal, leads, network, webhooks)
├── domain-pending/  # Activation-pending probe route
├── llms.txt/ | robots.txt/ | rss.xml/ | sitemap.xml/ | news-sitemap.xml/  # Machine-readable surfaces
├── manifest.ts # PWA manifest
└── page.tsx | layout.tsx | globals.css | error.tsx | global-error.tsx | not-found.tsx | opengraph-image.tsx
```

Route groups do not affect URL paths. `src/app/(site)/pricing/page.tsx` serves `/pricing`.

There are no `_composition/`, `_lib/`, or `_components/` group folders. Services are wired directly in route handlers via shared modules — do not invent underscore-prefixed composition roots without updating this doc.

### Convention files per segment

| File | Purpose |
|---|---|
| `layout.tsx` | Shared UI wrapper (header, nav, sidebar) |
| `page.tsx` | Route content |
| `loading.tsx` | Suspense skeleton boundary |
| `error.tsx` | React error boundary |
| `not-found.tsx` | 404 for the segment |
| `route.ts` | API endpoint (no UI) |

## Path aliases

Configured in `tsconfig.json`:

```text
@/*              → ./src/*
@/components/*   → ./src/components/*
@/modules/*      → ./src/modules/*
@/data/*         → ./src/data/*
@/core/*         → ./src/core/*
@/integrations/* → ./src/integrations/*
@/ui/*           → ./src/ui/*
```

## Import boundaries (advisory)

- `src/modules/` encapsulates product capabilities (`audit`, `auth`, `billing`, `content`, `dashboard`, `delivery`, `integrations`, `moderation`, `persisted-config`, `publishing`, `site`). Only `dashboard`, `delivery`, and `integrations` currently expose a barrel `index.ts` — prefer importing every other module by file path (e.g. `@/modules/publishing/publication-policy`).
- `src/integrations/` holds provider adapters (`supabase`, `storage`, `redis`, `cloudflare`, `vercel`, `email`) and should stay server-only.
- `src/core/` holds the shared kernel (`config/`, errors, operation context, hostname, observability, routing, security, system, transactions).
- `src/app/` handles Next.js App Router concerns and should delegate business logic to `src/modules/` and `src/data/`.

## Multi-tenant routing

`src/proxy.ts` (Next.js 16 proxy convention) performs hostname-based request routing:

- **Dashboard host** → control-plane pages and API
- **API host** → v1 API surface
- **Webhook host** → webhook endpoints
- **Public tenant hosts** → exact-match hostname resolution to one Site

Every tenant operation resolves exactly one Organization. Public reads resolve Organization and Site from one exact normalized hostname. No fallback tenant exists in production. Denials are non-disclosing (`deny()` → opaque 404/400 + `noindex`), with platform security headers (CSP/HSTS) applied at the edge. Development exception: localhost and `*.vercel.app` preview hosts are rewritten to the Dashboard host in `src/proxy.ts` — never rely on this outside local/preview work.

## Server-only enforcement

Server-side modules import `server-only` at the top. The `server-only` npm package throws at build time if a server module is accidentally bundled into a client component.

## UI components

shadcn/ui components live in `src/components/ui/`. Config in `components.json` (aliases: `components` → `@/components`, `utils` → `@/ui/cn`, `ui` → `@/components/ui`, `lib` → `@/core`, `hooks` → `@/ui/hooks`).

## Commands

### Development

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run typecheck` | TypeScript without emit |
| `npm run lint` | ESLint (max-warnings=0) |
| `npm run audit:production` | `npm audit` for production deps at high severity |

### Database

Migrations in `src/data/migrations/` are applied manually in filename order against `DATABASE_DIRECT_URL`; there are no `db:*` npm scripts. Verify via `GET /api/health` (reports configuration validity and the Postgres snapshot version; the fail-closed schema-version gate is evaluated at runtime-context initialization, not in the handler).

## Database

- **ORM:** Drizzle with PostgreSQL dialect
- **Schema:** `src/data/schema/` (billing, content, editorial, identity, operations, runtime-config)
- **Migrations:** `src/data/migrations/`, forward-only SQL with Drizzle-kit metadata in `meta/`
- **Client:** factory `createRuntimeDatabase()` in `src/data/client.ts` (pooled URL, `prepare: false`); process-wide sharing via `getSharedRuntimeDatabase()`, also used by `src/core/config/runtime/runtime-context.ts`
- **Query policy (mandatory):** `AGENTS.md` §"Database access & egress" governs how queries are written — bounded and paginated reads, minimum column projection, no full-table dump, cache-never-justifies-a-bad-query, and the IDENTIFY → BOUND → CACHE → FREQUENCY → VERIFY → BLOCK gate. Read it before touching a repository, query, cache, or cron. Budget facts: `docs/architecture.md` §13.4; runbook: `docs/architecture-rules.md` §5.

## Configuration

- **Environment schema:** `src/core/config/bootstrap/bootstrap-schema.ts` — Zod-validated, all required values fail-closed (single production environment and `live` schema-gate mode are hardcoded)
- **Assembled config shape:** `src/core/config/runtime/runtime-schema.ts` — plain `RuntimeConfig` interface combining bootstrap env and the Postgres runtime snapshot; it does not parse env itself
- **Public config:** `src/core/config/public-config.ts` — browser-safe subset (`NEXT_PUBLIC_*` only)
- **Runtime context:** `src/core/config/runtime/runtime-context.ts` — single-flight init, registered via root `instrumentation.ts`
- **Contract:** `.env.example` — authoritative for bootstrap environment variables (`DATABASE_POOL_URL` for runtime, `DATABASE_DIRECT_URL` for migrations)

## File naming

- **Files:** `kebab-case.ts` / `kebab-case.tsx`
- **Components:** `PascalCase` exports
- **Functions/variables:** `camelCase`
- **Types/interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`

## Security invariants (binding safety requirements — see AGENTS.md)

- Secrets must stay out of browser bundles, logs, fixtures, and error responses; follow the server-only storage rules in `AGENTS.md`.
- Every tenant operation must derive exactly one authorized `organizationId`.
- Missing, malformed, or unauthorized inputs must receive the required non-disclosing denial.
- RLS is currently enforced at the PostgreSQL level with a dedicated non-owner runtime role. Changes to this security boundary require explicit owner approval and must preserve tenant isolation.

## Design system

Visual authority lives in code: tokens and base styles in `src/app/globals.css`, primitives in `src/components/ui/` (per `components.json`), tenant templates under `src/modules/site/components/`. Dark indigo control-room aesthetic, brass accent, Fraunces + IBM Plex type system. Follow the existing patterns; do not improvise new ones.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
