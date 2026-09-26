# Architecture Policy and Approval History

> **Status:** Split out of [architecture](architecture.md) on 2026-09-26. Nothing here is a binding invariant.
> **Owner:** Platform team.
> **Source of truth:** [architecture](architecture.md) for topology and invariants; the codebase wins on conflict.
> **Related:** [architecture](architecture.md) · [architecture rules](architecture-rules.md) · [migrations](migrations.md)

Sections 1 to 20 of [architecture](architecture.md) hold the binding design. This file collects the
three registers that used to sit inside it, because a reader could not tell which parts still
constrained the build:

- sections 21 to 23 are owner relaxations from 2026-09-14 that downgrade former requirements to
  advisory defaults;
- section 24 is the pre-launch approval record from 2026-08-30, kept only as history.

If you are changing the system, read [architecture](architecture.md). If you are checking whether
a deviation is permitted, read sections 21 to 23 below.

## 1. Quality architecture (advisory, relaxed 2026-09-14)

Recommended deterministic single-run checks are:

- TypeScript typecheck;
- lint;
- migration/environment checks;
- client-bundle and artifact secret scans.

Every tenant-sensitive stage should verify same-organization success, absent-resource denial, cross-organization denial, and mutation/audit failure atomicity. Any cross-organization content, media, cache, credential, job, analytics, or audit result warns (does not hard-fail the stage in relaxed mode).

## 2. Recommended seven-stage sequence (advisory, relaxed 2026-09-14)

Implementation may begin without waiting for document approval. The order below is preferred, not enforced:

1. **Major Baseline — Foundation:** one Next.js app, approved stack, Runtime Configuration, deployment contracts, and Quality Gate tooling.
2. **Major Tenancy — Persistence and authorization:** Drizzle schema/migrations/seed, Supabase Auth, tenant transactions, Membership, RBAC.
3. **Major Dashboard — Business and Dashboard:** shared services, Dashboard modules, Publisher Registry, canonical Articles, filtering, Basic Analytics, Audit Logs.
4. **Major Publishing — Media and publication:** private R2 media, durable jobs, Upstash dispatch, idempotency, leases/fencing, bounded retries, results.
5. **Major Delivery — Public delivery:** Cloudflare/Vercel exact-domain activation, hostname resolver, shared public templates, SEO, cache/invalidation.
6. **Major Integrations — External entry points:** API Keys, rate limiting, replay defense, customer/subscription administration.
7. **Major Release — Production readiness:** automated validation across all active root domains and regions, starting with Wonosobo, Magelang, and Semarang.

Each stage ideally follows the prior stage's Quality Gate, but stages may overlap or reorder with a brief recorded rationale. No prior approval required in relaxed mode.

## 3. Architecture decision boundaries (advisory defaults, relaxed 2026-09-14)

The following are discouraged by default but allowed with owner approval and a brief note — no full requirements/architecture revision required:

- additional tenant applications, Vercel projects, Supabase projects/databases/Auth instances, R2 buckets, Redis resources, public templates, or deployments;
- Vercel nameserver delegation, Vercel DNS authority, or Vercel wildcard-domain registration;
- another primary database, ORM, Auth provider, object store, queue, DNS provider, host, CSS/component system, messaging platform, validation library, unit-test framework, or end-to-end framework;
- direct tenant SQL from transport adapters;
- browser access to privileged database/provider credentials;
- public R2 bucket or prefix-wide authorization;
- tenant selection from request bodies or fallback hostname matching;
- Redis or cron as the durable publication authority;
- database transactions held open during provider calls;
- unbounded retries or long-running workers;
- mutation success when the required Audit Log did not commit.

## 4. Implementation-stage confirmations (approval record, 2026-08-30)

The following operational confirmations remain required at the applicable implementation or promotion stage:

1. **Domain operations:** confirm that every active apex Site is associated exactly with the one Vercel project plus a wildcard with issued certificate, while Cloudflare retains nameserver/DNS authority. Regionals stay DB-only.
2. **Provider capacity:** confirm the Vercel plan supports the projected domain count (exact + wildcard, both free on Pro; only traffic is metered), cron frequency, execution duration, and the unbounded domain-plus-regional-Site scale target.
3. **TLS convention:** confirm one-label regional hostnames fit Cloudflare certificate coverage and that Full (strict) origin validation succeeds.
4. **Numeric runtime bounds:** approve retry attempts/delays, lease durations, worker batch/deadline, media limits, signed URL TTLs, cache TTLs, rate limits, webhook freshness, and replay retention.
5. **Credential ownership:** approve least-privilege roles, storage, rotation, and incident ownership for Cloudflare, Vercel, Supabase runtime/migration, R2, Upstash, webhook, and cron secrets.
6. **Database defenses:** confirm the composite-foreign-key, transaction-local context, RLS defense-in-depth, append-only audit grants/trigger, and transaction-pooler approach.
7. **Recovery objectives:** approve operational alerting and response expectations for pending activation, dispatch gaps, expired leases, invalidation bypass, and cleanup backlogs.
