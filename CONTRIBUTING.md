# Contributing to Indicate (relaxed mode — advisory, 2026-09-14)

Thank you for contributing to Indicate. This document covers the development
workflow, conventions, and expectations for all changes. Nothing here
hard-blocks progress: failing a convention warns, and work may proceed with
owner sign-off and a brief recorded note.

By contributing, you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md) and to license your contribution under
the [Apache License 2.0](LICENSE). Security-sensitive reports follow
[SECURITY.md](SECURITY.md); general help follows [SUPPORT.md](SUPPORT.md).

## Developer Certificate of Origin (DCO)

All commits should carry a `Signed-off-by` trailer (`git commit -s`), certifying
the [Developer Certificate of Origin v1.1](https://developercertificate.org/):
you wrote the change or have the right to submit it under Apache-2.0, and you
consent to the inbound=outbound license without additional terms. By signing
off you also grant the patent license contemplated by Apache-2.0 §3 for your
contribution. Contributions without a sign-off may still merge with explicit
owner sign-off. Do not submit
third-party code, stock assets, or commercial fonts without proving a
compatible license in the PR.

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
| `src/app/` | Next.js App Router routing only: `(site)`, `(network)`, `(auth)`, `(dashboard)` surfaces and `api/` route handlers (health, v1, dashboard, internal, leads, network, webhooks) |
| `src/components/ui/` | Design-system primitives (shadcn/Radix) |
| `src/modules/` | Bounded contexts (`audit`, `auth`, `billing`, `content`, `dashboard`, `delivery`, `integrations`, `moderation`, `persisted-config`, `publishing`, `site`); only `dashboard`, `delivery`, and `integrations` currently expose a barrel `index.ts` — import other modules by file path |
| `src/core/` | Shared kernel: `config/` (environment validation), errors, operation context, hostname, observability, routing, security, system, transactions |
| `src/data/` | Persistence: Drizzle schema, `repos/`, `client.ts`, and forward-only-by-default SQL `migrations/` |
| `src/integrations/` | Provider adapters: Supabase, R2 storage, Upstash Redis, Telegram, Cloudflare, Vercel (server-only) |
| `src/ui/` | Shared client-safe UI utilities (`cn`, themes, hooks, site helpers) |
| `proxy.ts` | Edge middleware: hostname resolution, security headers, platform guards |
| `.agents/skills/` | Agent playbooks (`indicate-conventions`, `tenant-onboarding`, provider skills); see `AGENTS.md` for load triggers |

There are no `_composition/`, `_lib/`, or `_components/` group folders in `src/app/` (corrected 2026-09-14 to match `CLAUDE.md` and disk). Services are wired directly in route handlers via shared modules.

The intended dependency direction is
`app -> application -> domain/ports <- infrastructure` as applied to this
layout: `src/app/` delegates all business logic to `src/modules/` and
`src/data/`; `src/modules/` encapsulates product capabilities behind
file-path imports (only `dashboard`, `delivery`, and `integrations`
expose `index.ts`); `src/integrations/` stays server-only; `src/core/` holds the
shared kernel. Repository policies enforce import, dependency, deployment,
migration, release, and secret boundaries.

### Tool configuration homes

| Path | Serves | Rule |
|---|---|---|
| `.agents/skills/` | Canonical skill source for all agent tools | Edit here only; `.claude/skills` and `.kiro/skills` are junctions to this directory — never edit through them |
| `.mcp.json` | Canonical repo MCP declaration | `opencode.jsonc` mirrors it; `.vscode/mcp.json` is editor-local convenience |
| `supabase/` | Supabase CLI residue (`.temp/`, git-ignored) | Leave alone |
| `public/brand/` | Static control-plane masters | Tenant brand bytes live in R2, never here |

### Import boundary enforcement (advisory in relaxed mode)

**Discouraged imports (warn, don't block):**

- `src/app/` handles routing only — no business logic, no tenant SQL, no
  provider SDK calls from route shells.
- `src/modules/*` must not reach into another module's internals — import by file path (only `dashboard`, `delivery`, and `integrations` expose a public `index.ts` entry).
- Domain and pure policy code imports no framework or provider clients.
- Application services receive a verified context, validated command, and
  injected ports; they do not read request globals.
- Provider SDK types cannot cross into domain or application interfaces.
- Client bundles receive only explicitly public configuration (`NEXT_PUBLIC_*`
  Supabase browser values) — never privileged credentials.
- `src/integrations/` never imports from `src/app/`.

Import boundaries are advisory in relaxed mode. If you are unsure where code
belongs, mirror the existing layer and note it in the PR.

### App Router conventions (advisory)

- Route groups `(site)`, `(network)`, `(auth)`, `(dashboard)` organize without
  affecting URLs.
- Colocated non-routable code per group is allowed; shared composition lives in
  the shared root when needed.
- Server-only modules should start with `import 'server-only'`.
- `'use client'` is pushed to interactive leaf components only; client leaves
  should not import server-only modules.

## Pull request process

Use the [pull request template](.github/PULL_REQUEST_TEMPLATE.md). Every PR
should have a linked issue, gate evidence on the head commit, and the
tenant-isolation checklist when applicable — missing items warn, they don't
block without owner say-so.

### Before submitting (recommended)

These should pass locally (warnings allowed with a note):

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

- Every PR should have a Release Quality Gate
  (`.github/workflows/quality-gate.yml`: `typecheck`, `lint`, production
  `build`) on the head commit. Promotion beyond CI is a manual operator
  decision — promoting a red or unchecked commit needs explicit owner
  sign-off with a recorded risk note.
- Architecture boundary violations are advisory (warn, don't block).
- Security-sensitive changes should have review of tenant isolation, RLS
  policies and grants, secret handling, and audit atomicity.
- Migration changes should have review of forward-only-by-default compatibility
  (**expand → backfill → verify → contract**), credential separation, and the
  schema gate. Down migrations are discouraged; in development they are allowed
  with reviewer approval.

## Database migrations (defaults — relaxed 2026-09-14)

### Rules (advisory)

1. **Forward-only by default** — rollback is preferably a new forward migration
   or a schema-compatible deployment; history edits and down migrations are
   allowed in development with reviewer approval.
2. **Hand-written SQL preferred** — migrations are reviewed, not generated.
   `drizzle-kit generate` is discouraged (the reviewed sequence contains PL/pgSQL
   functions, triggers, and row level security policies it cannot express),
   not banned.
3. **Reviewed before applied** — every migration should be code-reviewed before execution.
4. **Compatibility-aware** — destructive changes should follow
   **expand → backfill → verify → contract** across releases.
5. **Append-only metadata preferred** — avoid editing migration metadata to conceal a failed
   migration outside development.
6. **Separate credentials** — apply with the direct migration credential
   (`DATABASE_DIRECT_URL`), verify through the pooled runtime credential
   (`DATABASE_POOL_URL`). Avoid application runtime credentials for
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
  `sancaphenacakra@gmail.com` per [SECURITY.md](SECURITY.md) — never a public
  issue.

## Design system

Visual authority lives in code: design tokens and base styles in
`src/app/globals.css`, primitives in `src/components/ui/` (per
`components.json`), and tenant templates under
`src/modules/site/components/`. Key constraints (follow the existing
patterns, do not improvise new ones):

- Dark indigo atmosphere, brass accent used sparingly
- Fraunces for editorial/display, IBM Plex Sans for interface, IBM Plex Mono for data
- Flat surfaces with hairline borders, small radius (3–4px), no pill shapes
- Data displayed exactly (no rounding, no dramatization)
- No infinite animations; no AI-slop patterns (commented code, redundant
  narration, emoji, divider art) anywhere including stylesheets

## Documentation (update when practical)

When making structural changes, consider updating these files:

| File | What to update |
|---|---|
| `README.md` | Repository layout, commands, architecture overview |
| `docs/ARCHITECTURE.md` | System topology, layer responsibilities |
| `docs/MIGRATIONS.md` | Migration or rollback procedure changes |
| `docs/PRODUCTION_READINESS_RUNBOOK.md` | Readiness or rollback changes |
| `src/app/globals.css` + `src/components/ui/` | Visual tokens, component specs (if adding UI) |
| `CHANGELOG.md` | Notable changes under `[Unreleased]` |
| `.env.example` | Runtime contract changes (placeholders only) |

## Questions

If you are unsure where code belongs or how to handle a specific pattern, check:

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
2. [docs/PRD.md](docs/PRD.md) for product requirements
3. [src/app/globals.css](src/app/globals.css) and `src/components/ui/` for visual decisions
4. [SUPPORT.md](SUPPORT.md) for where to ask for help
5. Existing code in the same layer for established patterns
