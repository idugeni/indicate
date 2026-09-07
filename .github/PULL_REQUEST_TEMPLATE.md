## Summary

<!-- What changes, and why. Link the issue: Closes #<id>. -->

Closes #

## Change type

- [ ] `feat` — new capability
- [ ] `fix` — defect fix
- [ ] `refactor` / `perf` — no behavior change / performance
- [ ] `docs` / `chore` / `ci` / `build` — non-runtime change
- [ ] `db` — migration or schema-adjacent change
- [ ] Security-sensitive change (see checklist below)

## Scope

<!-- Modules touched, e.g. content, publishing, site, dashboard, api, auth -->

- [ ] No migration included
- [ ] Forward-only migration included in `src/data/migrations/` (hand-written, reviewed)

## Verification (required)

Paste evidence — PRs without a green gate on the exact head commit are not
promoted.

```text
npm run typecheck  # result:
npm run lint       # result:
npm run build      # result:
GET /api/health    # valid configuration before/after (for runtime or migration changes):
```

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` (production) passes
- [ ] `GET /api/health` reports valid configuration (if runtime/migration touched)

## Tenant-isolation checklist

- [ ] Every mutation derives exactly one authorized `organizationId`; no tenant
      selection from request bodies.
- [ ] Public reads resolve Organization/Site from one exact active normalized
      hostname only — no suffix match, no fallback tenant.
- [ ] Missing / malformed / unknown / cross-Organization inputs receive
      non-disclosing denial (no foreign identifiers, no internals).
- [ ] Composite `organization_id` predicates preserved; RLS, grants, and
      transaction-local context untouched or explicitly reviewed.
- [ ] Cache identity, SEO output, media authorization, and audit rows remain
      Organization/Site-scoped.
- [ ] Publication changes preserve idempotency, leases, fencing, bounded
      retries, and legal state transitions.

## Migration checklist (complete only when a migration is included)

- [ ] Forward-only SQL in `src/data/migrations/`, applied in filename order
      against `DATABASE_DIRECT_URL` (never the runtime credential).
- [ ] Compatibility follows **expand → backfill → verify → contract** where
      destructive change is involved.
- [ ] Migration metadata untouched; no edit conceals a failed migration.
- [ ] Schema gate passes through the pooled runtime credential
      (`DATABASE_POOL_URL`) before activation.
- [ ] Rollback plan is a new forward migration or a schema-compatible
      deployment — never a down migration or a second project/topology.

## Security checklist

- [ ] No credentials, database URLs, tokens, webhook secrets, signed URLs, or
      production host data in code, fixtures, logs, audit context, or error
      responses.
- [ ] Server-only boundaries preserved (`server-only` imports; `'use client'`
      leaves import no server modules; no secrets in browser bundles).
- [ ] Security-sensitive DB change and its append-only audit record commit
      atomically.
- [ ] Rate-limit, replay-defense, and webhook-freshness behavior unchanged or
      explicitly covered.
- [ ] If this fixes a vulnerability: coordinated disclosure per
      [SECURITY.md](../SECURITY.md) (no public exploit detail before fix).

## Origin / license checklist

- [ ] All commits carry `Signed-off-by` (DCO v1.1); no third-party code/assets without a compatible license noted above.
- [ ] Upstream attributions updated in `THIRD-PARTY-NOTICES.md` when a dependency, font, icon, or vendored component changes.

## Docs updated

- [ ] `README.md` / `docs/ARCHITECTURE.md` / `docs/MIGRATIONS.md` /
      `docs/PRODUCTION_READINESS_RUNBOOK.md` as applicable
- [ ] `CHANGELOG.md` entry under `[Unreleased]`
- [ ] `.env.example` updated only if the runtime contract changed (placeholders
      only, never real values)

## Reviewer notes

<!-- Risk areas, follow-ups, anything the reviewer should double-check. -->
