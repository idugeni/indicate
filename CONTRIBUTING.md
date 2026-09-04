# Contributing to Indicate

Thank you for contributing to Indicate. This document covers the development
workflow, conventions, and expectations for all changes.

By contributing, you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md) and to license your contribution under
the [Apache License 2.0](LICENSE). Security-sensitive reports follow
[SECURITY.md](SECURITY.md); general help follows [SUPPORT.md](SUPPORT.md).

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | >= 22 | Runtime and builds |
| npm | Bundled with Node | Dependency management (`package-lock.json` is authoritative) |
| PostgreSQL | 17 | Durable tenant, editorial, publication, and audit state (via Supabase) |

## Development setup

1. **Clone and install:**

   ```sh
   git clone https://github.com/idugeni/indicate.git
   cd indicate
   npm ci
   ```

2. **Configure environment:**

   ```sh
   cp .env.example .env.local
   ```

   Replace every placeholder with authorized **development** values. `.env.example`
   is the authoritative contract for the currently implemented runtime; only it
   is tracked. Never commit `.env.local`, credentials, database URLs, tokens,
   webhook secrets, signed URLs, or production host data. Next.js loads
   `.env.local` for application commands; export the same values into the
   process environment when running database tooling manually.

3. **Prepare the database:** apply each reviewed SQL file in
   `src/data/migrations/` in filename order against `DATABASE_DIRECT_URL`
   (via `psql` or the Supabase SQL editor). Runtime traffic uses
   `DATABASE_POOL_URL`.

4. **Start the dev server:**

   ```sh
   npm run dev
   ```

   Verify with `GET /api/health` (reports configuration validity) and the
   application logs; the runtime schema gate fails closed on version mismatch.

## Code style

### TypeScript

- **Strict mode** — `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Consistent type imports** — `@typescript-eslint/consistent-type-imports: error`
- **No explicit any** — `@typescript-eslint/no-explicit-any: error`
- **ESM only** — `"type": "module"` in `package.json`

### Naming

| Element | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `hostname-resolver.ts` |
| Components | `PascalCase` | `SiteShell` |
| Functions | `camelCase` | `resolveNetworkSite` |
| Types/interfaces | `PascalCase` | `NetworkSiteData` |
| Constants | `UPPER_SNAKE_CASE` | `SERVICE_NAME` |

### Formatting

No Prettier config — follow the existing formatting conventions in the codebase.
Use single quotes, trailing commas, and 2-space indentation.

### Path aliases

Configured in `tsconfig.json` (all under `src/`):

```text
@/*              → ./src/*
@/components/*   → ./src/components/*
@/modules/*      → ./src/modules/*
@/data/*         → ./src/data/*
@/core/*         → ./src/core/*
@/integrations/* → ./src/integrations/*
@/ui/*           → ./src/ui/*
```

## Architecture rules

The source of truth is [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
The summary below must not contradict it.

### Repository layout

| Path | Purpose |
|---|---|
| `src/app/` | Next.js App Router routing only: `(site)`, `(network)`, `(auth)`, `(dashboard)` surfaces and `api/` route handlers (health, v1, dashboard, internal, network, webhooks) |
| `src/components/ui/` | Design-system primitives (shadcn/Radix) |
| `src/modules/` | Bounded contexts with a public entry (`index.ts`): auth, billing, content, dashboard, delivery, integrations, persisted-config, publishing, site; domain UI colocated in `*/components/` |
| `src/core/` | Shared kernel: `config/` (environment validation), errors, operation context, hostname, observability, routing, security, system, transactions |
| `src/data/` | Persistence: Drizzle schema, `repos/`, `client.ts`, and forward-only SQL `migrations/` |
| `src/integrations/` | Provider adapters: Supabase, R2 storage, Upstash Redis, Telegram, Cloudflare, Vercel (server-only) |
| `src/ui/` | Shared client-safe UI utilities (`cn`, themes, hooks, site helpers) |
| `proxy.ts` | Edge middleware: hostname resolution, security headers, platform guards |
| `.kiro/specs/` | Implemented MVP specification and pending database-backed runtime configuration specification |

The intended dependency direction is
`app -> application -> domain/ports <- infrastructure` as applied to this
layout: `src/app/` delegates all business logic to `src/modules/` and
`src/data/`; `src/modules/` encapsulates product capabilities behind
`index.ts`; `src/integrations/` stays server-only; `src/core/` holds the
shared kernel. Repository policies enforce import, dependency, deployment,
migration, release, and secret boundaries.

### Import boundary enforcement

**Prohibited imports:**

- `src/app/` handles routing only — no business logic, no tenant SQL, no
  provider SDK calls from route shells.
- `src/modules/*` must not reach into another module's internals — only its
  public `index.ts` entry.
- Domain and pure policy code imports no framework or provider clients.
- Application services receive a verified context, validated command, and
  injected ports; they do not read request globals.
- Provider SDK types cannot cross into domain or application interfaces.
- Client bundles receive only explicitly public configuration (`NEXT_PUBLIC_*`
  Supabase browser values) — never privileged credentials.
- `src/integrations/` never imports from `src/app/`.

Import boundaries are review-time blocking. If you are unsure where code
belongs, mirror the existing layer and ask in the PR.

### App Router conventions

- Route groups `(site)`, `(network)`, `(auth)`, `(dashboard)` organize without
  affecting URLs.
- Private folders `_components/`, `_composition/`, `_lib/` colocate
  non-routable code per group; shared composition lives in the shared
  `_composition/` root.
- Server-only modules start with `import 'server-only'`.
- `'use client'` is pushed to interactive leaf components only; client leaves
  never import server-only modules.

## Pull request process

Use the [pull request template](.github/PULL_REQUEST_TEMPLATE.md). Every PR
needs a linked issue, gate evidence on the exact head commit, and the
tenant-isolation checklist.

### Before submitting

All of these must pass locally:

```sh
npm run typecheck     # TypeScript compilation
npm run lint          # ESLint with zero-warning threshold
npm run build         # Production build succeeds
```

For runtime or migration changes, also confirm `GET /api/health` reports a
valid configuration before and after.

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `build`.

Scopes: `site`, `network`, `dashboard`, `auth`, `api`, `publishing`, `content`,
`billing`, `delivery`, `integrations`, `persisted-config`, `data`, `core`,
`config`, `ui`, `app`, `docs`, `ci`.

### Review expectations

- Every PR must have a passing Release Quality Gate
  (`.github/workflows/quality-gate.yml`: `typecheck`, `lint`, production
  `build`) on the exact head commit. Promotion beyond CI is a manual operator
  decision — never promote a red or unchecked commit.
- Architecture boundary violations are blocking.
- Security-sensitive changes require explicit review of tenant isolation, RLS
  policies and grants, secret handling, and audit atomicity.
- Migration changes require review of forward-only compatibility
  (**expand → backfill → verify → contract**), credential separation, and the
  schema gate. Destructive down migrations are not accepted.

## Database migrations

### Rules

1. **Forward-only** — no down migrations. Rollback is a new forward migration
   or a schema-compatible deployment.
2. **Hand-written SQL** — migrations are reviewed, not generated.
   `drizzle-kit generate` is not used: the reviewed sequence contains PL/pgSQL
   functions, triggers, and row level security policies it cannot express.
3. **Reviewed before applied** — every migration is code-reviewed before execution.
4. **Compatibility-aware** — destructive changes follow
   **expand → backfill → verify → contract** across releases.
5. **Append-only metadata** — never edit migration metadata to conceal a failed
   migration.
6. **Separate credentials** — apply with the direct migration credential
   (`DATABASE_DIRECT_URL`), verify through the pooled runtime credential
   (`DATABASE_POOL_URL`). Never use an application runtime credential for
   migration ownership.

### Adding a migration

1. Write the SQL file in `src/data/migrations/` in filename order.
2. Include PL/pgSQL functions, triggers, and RLS policies as needed.
3. Apply the migration through the direct credential, then run the schema gate
   through the pooled runtime credential before activation.
4. Review every migration body for drift against the typed schema before
   promotion. Full procedures: [docs/MIGRATIONS.md](docs/MIGRATIONS.md) and
   [docs/PRODUCTION_READINESS_RUNBOOK.md](docs/PRODUCTION_READINESS_RUNBOOK.md).

## Security

### Mandatory practices

- **Never commit secrets.** No credentials in code, fixtures, logs, error
  responses, audit context, or `.env` (only `.env.example` is tracked, with
  placeholders only).
- **server-only enforcement.** Server-side modules import `server-only`. Keep
  secrets out of client bundles; review that `'use client'` leaves never
  import server-only modules.
- **Tenant isolation.** Every mutation derives exactly one authorized
  `organizationId`. Public reads resolve from exact hostname only — no suffix
  match, no fallback tenant.
- **Non-disclosing errors.** Missing, malformed, unauthorized, and
  cross-organization requests return sanitized responses with no internal
  detail or foreign identifiers.
- **RLS at database layer.** PostgreSQL row-level security is forced for the
  runtime role. The runtime role has no `BYPASSRLS`.
- **Atomic audit.** Security-sensitive changes and required audit records
  commit in the same transaction.
- **Report privately.** Suspected vulnerabilities go to
  `officialelsa21@gmail.com` per [SECURITY.md](SECURITY.md) — never a public
  issue.

## Design system

All visual decisions must follow [docs/DESIGN.md](docs/DESIGN.md). Key constraints:

- Dark indigo atmosphere, brass accent used sparingly
- Fraunces for editorial/display, IBM Plex Sans for interface, IBM Plex Mono for data
- Flat surfaces with hairline borders, small radius (3–4px), no pill shapes
- Data displayed exactly (no rounding, no dramatization)
- See the Anti-Slop Rules in `docs/DESIGN.md` for prohibited patterns

## Documentation

When making structural changes, update these files:

| File | What to update |
|---|---|
| `README.md` | Repository layout, commands, architecture overview |
| `docs/ARCHITECTURE.md` | System topology, layer responsibilities |
| `docs/MIGRATIONS.md` | Migration or rollback procedure changes |
| `docs/PRODUCTION_READINESS_RUNBOOK.md` | Readiness or rollback changes |
| `docs/DESIGN.md` | Visual tokens, component specs (if adding UI) |
| `CHANGELOG.md` | Notable changes under `[Unreleased]` |
| `.env.example` | Runtime contract changes (placeholders only) |

## Questions

If you are unsure where code belongs or how to handle a specific pattern, check:

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
2. [docs/PRD.md](docs/PRD.md) for product requirements
3. [docs/DESIGN.md](docs/DESIGN.md) for visual decisions
4. [SUPPORT.md](SUPPORT.md) for where to ask for help
5. Existing code in the same layer for established patterns
