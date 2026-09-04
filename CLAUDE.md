# Indicate

Multi-tenant media syndication platform — one central Dashboard operating many news domains from a single shared deployment.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.3 (App Router) |
| UI | React 19.2.8, Tailwind CSS 4, shadcn/ui, Radix |
| Language | TypeScript 5.9.3 (strict mode) |
| Database | PostgreSQL 17 via Supabase, Drizzle ORM |
| Validation | Zod 4 |
| Object storage | Cloudflare R2 (private) |
| Cache/queue | Upstash Redis |
| Auth | Supabase Auth |
| Runtime | Node.js >= 22, ESM |

## Architecture

Hexagonal / ports-and-adapters modular monolith. One application, one database, one deployment.

**Dependency direction:**

```
app/ → application/ → domain/ + ports/ ← infrastructure/
```

Application code lives at the repository root (no `src/` wrapper), keeping `app/` purely for routing. Domain folders: `domain/`, `application/`, `ports/`, `infrastructure/`, `db/`, `config/`, `shared/`, `lib/`.

- `domain/` — Pure domain models, value objects, policies. No I/O, no framework imports.
- `application/` — Tenant-aware use cases and business services. Orchestrates domain and ports.
- `ports/` — Repository and provider interfaces (TypeScript interfaces only).
- `infrastructure/` — Concrete adapters: Supabase, R2, Redis, Cloudflare, Vercel, Telegram, system.
- `db/` — Drizzle schema, client factory, and repository implementations.
- `config/` — Zod-validated environment schema (`schema.ts`), public config (`public.ts`), runtime context.
- `shared/` — Cross-cutting: errors, hostname normalization, security utilities, routing, types, UI components.
- `lib/` — Framework-specific adapters (Supabase SSR client).

## App Router conventions

### Route groups

```
app/
├── (site)/     # Service landing and informational pages (Dashboard host only)
├── (network)/        # Tenant-facing public content (articles, categories, search)
├── (auth)/          # Authentication flows (sign-in, callback)
├── (dashboard)/           # Protected editorial Dashboard
├── api/             # API routes (health, v1, dashboard, internal, public, webhooks)
├── _composition/    # Shared composition roots (cross-group)
└── _lib/            # Shared route-specific utilities
```

Route groups do not affect URL paths. `(site)/pricing/page.tsx` serves `/pricing`.

### Private folders

Underscore-prefixed folders are excluded from routing:

- `_components/` — Route-group-specific React components
- `_composition/` — Dependency injection / service wiring per group
- `_lib/` — Group-specific utilities and guards

### Composition roots

Each route group may have its own `_composition/` directory wiring services for that concern. Shared compositions used across groups live in `app/_composition/`.

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

```
@/*              → ./src/*
@/components/*   → ./src/components/*
@/modules/*      → ./src/modules/*
@/data/*         → ./src/data/*
@/core/*         → ./src/core/*
@/integrations/* → ./src/integrations/*
@/ui/*           → ./src/ui/*
```

## Import boundaries

- `src/modules/` encapsulates product capabilities (`auth`, `billing`, `content`, `dashboard`, `delivery`, `integrations`, `persisted-config`, `publishing`, `site`); each module exposes a public entry via `index.ts`.
- `src/integrations/` holds provider adapters (`supabase`, `storage`, `redis`, `telegram`, `cloudflare`, `vercel`) and stays server-only.
- `src/core/` holds the shared kernel (`config/`, errors, operation context, hostname, observability, routing, security, system, transactions).
- `src/app/` handles Next.js App Router concerns only and delegates all business logic to `src/modules/` and `src/data/`.

## Multi-tenant routing

`proxy.ts` (Next.js 16 proxy convention) performs hostname-based request routing:

- **Dashboard host** → control-plane pages and API
- **API host** → v1 API surface
- **Webhook host** → webhook endpoints
- **Public tenant hosts** → exact-match hostname resolution to one Site

Every tenant operation resolves exactly one Organization. Public reads resolve Organization and Site from one exact normalized hostname. No fallback tenant exists.

## Server-only enforcement

Server-side modules import `server-only` at the top. The `server-only` npm package throws at build time if a server module is accidentally bundled into a client component.

## UI components

shadcn/ui components live in `src/components/ui/`. Config in `components.json` (aliases point to `@/components/ui` and `@/ui/cn`).

## Commands

### Development

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run typecheck` | TypeScript without emit |
| `npm run lint` | ESLint (max-warnings=0) |

### Database

Migrations in `src/data/migrations/` are applied manually in filename order against `DATABASE_DIRECT_URL`; there are no `db:*` npm scripts. Verify via `GET /api/health`.

## Database

- **ORM:** Drizzle with PostgreSQL dialect
- **Schema:** `src/data/schema/` (editorial, identity, operations, runtime-config)
- **Migrations:** `src/data/migrations/`, forward-only, hand-written SQL
- **Client:** Singleton via `src/data/client.ts`, pooled URL for runtime, direct URL for migrations

## Configuration

- **Environment schema:** `src/core/config/runtime/runtime-schema.ts` — Zod-validated, all required values fail-closed
- **Public config:** `src/core/config/public-config.ts` — browser-safe subset
- **Runtime context:** `src/core/config/runtime/runtime-context.ts` — registered via `instrumentation.ts`
- **Contract:** `.env.example` — authoritative for currently implemented environment variables

## File naming

- **Files:** `kebab-case.ts` / `kebab-case.tsx`
- **Components:** `PascalCase` exports
- **Functions/variables:** `camelCase`
- **Types/interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`

## Security invariants

- Secrets stay in server-only environment storage; never in browser bundles, logs, fixtures, or error responses.
- Every tenant operation derives exactly one authorized `organizationId`.
- Missing, malformed, or unauthorized inputs receive non-disclosing denial.
- RLS enforced at the PostgreSQL level with a dedicated non-owner runtime role.

## Design system

All visual decisions follow `DESIGN.md`. Dark indigo control-room aesthetic, brass accent, Fraunces + IBM Plex type system. See `DESIGN.md` for tokens, components, and anti-slop rules.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
