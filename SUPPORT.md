# Support

## Where to get help

| Channel | Use for |
|---------|---------|
| [Documentation](docs/PRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Migrations](docs/MIGRATIONS.md) · [Readiness runbook](docs/PRODUCTION_READINESS_RUNBOOK.md) | First stop for behavior, topology, and operations |
| [Bug report](.github/ISSUE_TEMPLATE/bug_report.yml) | Reproducible defects on a specific commit |
| [Feature request](.github/ISSUE_TEMPLATE/feature_request.yml) | Proposed capabilities with tenant-isolation analysis |
| [Contributing guide](CONTRIBUTING.md) | Environment setup, conventions, PR process |
| Email `sancaphenacakra@gmail.com` | Security issues (see [SECURITY.md](SECURITY.md)) and private matters only |

Response target: **5 business days** for public issues. Security reports follow
the [72-hour acknowledgement target](SECURITY.md#reporting-a-vulnerability).

## Before opening an issue

1. Search existing [issues](https://github.com/idugeni/indicate/issues) —
   your problem may already be reported or fixed on `main`.
2. Reproduce on the latest `main` and record the exact commit SHA.
3. Collect: `APP_ENVIRONMENT`, failing route/host class (Dashboard, API,
   webhook, tenant), `GET /api/health` output with secrets redacted,
   and relevant application logs.
4. Confirm you ran the gate locally: `npm run typecheck`, `npm run lint`,
   `npm run build`.

## What to include

- **Bugs:** expected vs. actual behavior, minimal reproduction steps,
  commit SHA, Node version (`>= 22`), and whether migrations in
  `src/data/migrations/` were applied in filename order.
- **Features:** problem statement, proposed behavior, Organization scoping
  (how `organizationId` is derived), hostname/cache/SEO impact, migration
  compatibility (expand → backfill → verify → contract), and audit impact.
- **Never include:** credentials, database URLs, tokens, webhook secrets,
  signed URLs, production host data, or raw provider failure bodies.

Issues missing reproduction detail may be closed with a request for more
information.

## Supported setup

- Node.js **22 or newer**, `npm ci` from the authoritative `package-lock.json`.
- PostgreSQL **17** (via Supabase). Runtime traffic uses `DATABASE_POOL_URL`;
  migrations use `DATABASE_DIRECT_URL` in filename order.
- Configuration from `.env.example` copied to git-ignored `.env.local` with
  authorized **development** values only.

Production readiness is environment-dependent. Always run the deterministic,
provider, and readiness gates against authorized resources before any
promotion decision — see the
[readiness runbook](docs/PRODUCTION_READINESS_RUNBOOK.md).

## Security vs. support boundary

Suspected vulnerabilities (isolation bypass, auth bypass, secret leak, RLS
regression) must **not** be filed as public issues. Follow
[SECURITY.md](SECURITY.md) and email `sancaphenacakra@gmail.com` instead.
