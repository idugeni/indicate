# AGENTS.md

This file is the repository engineering rulebook.

## 1. Precedence

1. Explicit owner instructions take precedence over repository defaults, except security, compliance, tenant isolation, data integrity, and other hard safety requirements.
2. Repository conventions are mutable. If a rule blocks a required fix, update the rule and related documentation in the same change.
3. Never use "out of scope", "large refactor", historical decisions, or documentation conventions as a reason to leave a known defect unfixed.
4. Do not stop at a report when the task requests implementation.
5. Do not declare completion while any requested P0/P1/P2 issue remains OPEN, PARTIAL, MITIGATED, or RESIDUAL.

## 2. Engineering Workflow

For every non-trivial change:

> INSPECT → IDENTIFY → BOUND → IMPLEMENT → VERIFY → RE-AUDIT → CLOSE

Inspect relevant code, schema, indexes, callers, cache/invalidation paths, tests, and applicable skills before editing.

Define the real data flow and invariants before choosing a fix. Prefer root-cause fixes over caps, placeholders, workarounds, or masking behavior.

Structural refactors, migrations, SQL functions, indexes, read models, repository/service contract changes, and client data-layer changes are allowed when required to remove the root cause.

After implementation, re-audit the original issue and nearby variants. Do not assume the first fix is sufficient.

## 3. Tools and Skills

Use connected tools when they materially improve accuracy.

- Repository code → load `indicate-conventions`.
- Supabase/database/SQL/RLS/indexes → load `supabase` and `supabase-postgres-best-practices`.
- Drizzle/Postgres → load `drizzle-best-practices`.
- React/Next performance → use relevant Vercel/Next performance skills.
- Vercel cost/deployment → inspect live Vercel with explicit project/team scope.
- Cloudflare → use the Cloudflare skill and live API when required.
- Upstash Redis → use the Redis skill and live inspection for cache/queue work.
- Security → use `code-security` and `semgrep` when available.

Never guess schema, runtime state, library APIs, or external limits when they can be inspected.

For live infrastructure work:

> inspect → change → verify

## 4. Database Access & Egress

PostgreSQL/Supabase is the source of truth.

Default principle:

> READ LESS · FETCH ONCE · QUERY BY SCOPE · PAGINATE GROWING DATA · CACHE APPROPRIATELY · NEVER FULL-TABLE DUMP

Hard rules:

1. No unscoped reads on growable tables.
2. No `SELECT *` or Drizzle `select().from()` without explicit projection on hot paths.
3. No full-table hydration, snapshot, reconciliation, diff, indexing, cache warming, dashboard, cron, or background reads.
4. Never load a whole tenant and filter it in memory when SQL can perform the filtering.
5. Never fetch thousands of rows when the consumer needs a small subset.
6. No N+1. Use joins, batching, or read models.
7. No duplicate fetch/query when the data already exists in context or cache.
8. Every growable collection must use cursor/keyset pagination or another explicit bound that cannot silently truncate valid data.
9. A hard `LIMIT` is not a substitute for pagination when more records may exist.
10. Heavy JSONB and content fields must stay out of list paths unless explicitly required by the use-case.
11. `load`, `snapshot`, `readComplete`, `getAll`, and `listAll` are HIGH-RISK and require caller, row-count, and payload review.
12. Cache must not hide an unbounded or inefficient fallback query.
13. Do not introduce unnecessary PostgreSQL connection churn.

### SQL and CRUD

Prefer SQL-native targeted operations over:

> load-everything → process-in-memory → persist

Use targeted `INSERT`, `UPSERT`, `UPDATE`, `DELETE`, joins, aggregates, window functions, and read models where appropriate.

CRUD must operate on the smallest valid scope and projection while preserving transactional, concurrency, audit, and tenant-isolation semantics.

## 5. API & Client Data Flow

Audit the complete path:

> UI → hook/data layer → API/server action → service → repository → SQL → response → cache → UI

Rules:

- Avoid duplicate GETs from sibling components.
- Use a shared data layer when multiple consumers need the same resource.
- Deduplicate in-flight requests where appropriate.
- Abort or stale-guard obsolete client requests.
- Mutations should return enough information for incremental state updates.
- Avoid global/full-view refetch after small mutations when targeted invalidation or mutation response data is sufficient.
- Cache keys and invalidation must be tenant/resource scoped.
- `no-store` is not a universal default; use it only when freshness or sensitivity requires it.
- Preserve authorization, RLS, tenant isolation, idempotency, concurrency/version checks, and audit integrity.
- Preserve API compatibility unless a deliberate end-to-end contract migration is implemented.

## 6. Database Changes

When schema, SQL functions, indexes, RLS, or database behavior changes:

1. Inspect current schema and live state first.
2. Create a forward migration.
3. Update required migration metadata/bootstrap/digest files according to repository conventions.
4. Apply the migration when runtime verification is part of the task.
5. Verify the live schema, function signatures, indexes, policies, and representative queries.
6. Run database security/performance advisors when available.
7. Never treat an unapplied migration as a runtime fix.

## 7. Code Quality

- Keep functions small, typed, and self-explanatory.
- Remove dead code, debug logging, commented-out code, and stale TODO/FIXME/HACK when touching the area.
- Comments explain why, not what.
- Public API documentation uses TypeDoc/TSDoc.
- Prefer `@/` imports across directories.
- Icon-only controls require explicit `aria-label`.
- Do not use native DOM `title` as a tooltip.
- Do not add unnecessary polling or client effects.
- Follow the repository image-cost policy.

## 8. Verification

For code changes:

- `npm run typecheck`
- lint with zero warnings
- relevant tests and regression tests
- `npm run build`

For database/data-access changes:

- `npm run perf:db-access`
- required migration/bootstrap/digest checks
- live database verification when runtime SQL/schema changed

After all changes:

1. Re-run static searches for the original anti-pattern.
2. Review affected callers and downstream behavior.
3. Verify tenant isolation, authorization, concurrency, audit, and API behavior.
4. Compare before/after where measurable.

Performance claims must distinguish:

- **Observed** — directly measured.
- **Derived** — calculated from observed data.
- **Assumption** — not verified.

Never claim egress, latency, or query reduction without evidence.

## 9. Completion Standard

A task is complete only when:

- The root cause is fixed, not merely capped or masked.
- P0/P1/P2 findings relevant to the task are zero OPEN/PARTIAL/MITIGATED/RESIDUAL.
- Growable collections cannot silently truncate valid records.
- No unnecessary full-tenant hydration remains on hot list/read/mutation paths.
- No avoidable duplicate request/query, N+1, or global mutation refetch remains.
- No unnecessary large projection or JSONB payload remains.
- Required migrations are applied and verified when runtime changes are requested.
- All applicable verification gates are green.
- Documentation/rules are updated when otherwise they could cause the regression to return.

If any item remains unresolved, continue implementation. Do not stop by creating a follow-up task unless blocked by a genuine external dependency or hard security/compliance constraint.

## 10. Git

Before commit:

- Review `git status` and the exact diff.
- Do not stage unrelated or other-session changes.
- Never include secrets or `.env*`.
- Follow commit conventions in `CONTRIBUTING.md`.
- Use `git commit -s`.

Before push, all required verification gates must be green.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
