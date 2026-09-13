# Security Policy

## Supported versions

| Version | Supported          |
|---------|--------------------|
| `main` (latest) | Yes — security fixes land here first |
| Latest tagged release | Yes — backported when feasible |
| Older tags / forks | No — please upgrade |

Indicate is a multi-tenant publishing platform. A single vulnerability can
affect every tenant on the shared topology (one Next.js app, one Vercel
project, one Supabase PostgreSQL/Auth project, one private R2 bucket, one
Upstash Redis resource). Treat tenant-isolation failures as critical.

## What counts as a security issue

- Tenant isolation bypass: cross-Organization read/write, fallback-tenant
  selection, suffix-only hostname match, cache/SEO/media leak across Sites.
- Authentication/authorization bypass: Supabase session handling, API-key
  verification, Telegram identity mapping, cron secret, webhook replay.
- Secret exposure: privileged credentials in client bundles, logs, error
  responses, audit context, fixtures, signed URLs, or committed `.env` data.
- RLS/grant regression: runtime role gains `BYPASSRLS`, missing
  `organization_id` predicate, audit-log UPDATE/DELETE becomes possible.
- Publication integrity: lease/fencing bypass, stale-worker overwrite,
  idempotency-key collision handling failure.
- Supply-chain compromise of this repository (workflow, dependency, secret).

General bugs without a security impact belong in the public
[bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) instead.

## Reporting a vulnerability

**Do not open a public issue for a suspected vulnerability.**

Email **sancaphenacakra@gmail.com** with:

1. Affected commit SHA or tag (production is the only environment).
2. Host/route involved (Dashboard host, API host, webhook host, tenant host).
3. Step-by-step reproduction with the least-privileged actor possible.
4. What you expected (deny / isolate) vs. what happened (leak / bypass).
5. Logs or responses with secrets redacted (never send live credentials,
   database URLs, tokens, or signed URLs).

You will receive an acknowledgement within **72 hours**.
We will share a remediation plan and expected timeline within **7 days**,
then coordinate disclosure once a fix is available.

## Handling expectations

- We ask reporters not to access other tenants' data beyond what is needed
  to demonstrate the issue, not to disrupt availability, and not to disclose
  the issue publicly before a fix is coordinated.
- We credit reporters in the fix release notes unless anonymity is requested.
- Bounties are not offered at this time.

## Secrets and credentials

- Never commit `.env.local`, credentials, database URLs, tokens, webhook
  secrets, signed URLs, or production host data. Only `.env.example` is
  tracked, and it contains placeholders, never real values.
- If you accidentally push a secret: rotate it immediately at the provider,
  then notify us at the address above so we can verify revocation and audit
  exposure. Do not try to hide the leak by rewriting published history
  without rotating first.
- Production secrets live in the deployment secret manager / Vercel server
  environment values only. `NEXT_PUBLIC_*` is limited to explicitly public
  Supabase browser configuration.

## Release and rollback safety

Security fixes follow the same promotion rules as any release:

- Preserve a green Release Quality Gate (`typecheck`, `lint`, production
  `build`) on the exact promoted commit.
- Apply only reviewed forward migrations in filename order
  (`src/data/migrations/`), then confirm `GET /api/health` reports a valid
  configuration before and after.
- Promote only the already-built artifact to the existing Vercel project.
- Verify against [production readiness and rollback](docs/PRODUCTION_READINESS_RUNBOOK.md)
  before routing traffic. See also [migration operations](docs/MIGRATIONS.md).
