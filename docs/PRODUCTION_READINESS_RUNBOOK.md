# Indicate Production Readiness and Rollback Runbook

## Purpose

This runbook governs the final fail-closed release check for the one shared Indicate deployment. It does not create infrastructure, activate Sites, change DNS, register wildcard domains, transfer nameservers, apply migrations, seed data, or promote a deployment. It reads configuration and provider state, then returns a sanitized pass/fail report.

Cloudflare must remain authoritative for nameservers, DNS, wildcard records, edge TLS proxying, and CDN behavior. Vercel remains application hosting with exact Site-domain associations only. One Supabase project/database/Auth instance, one private R2 bucket, one Upstash Redis resource, one Vercel project, and one public template serve all Organizations.

## Preconditions

1. Run `npm run typecheck` and `npm run lint` with zero warnings.
2. Apply all reviewed forward migrations using the direct migration credential, in the order recorded by Drizzle's `src/data/migrations/meta/_journal.json`. The fail-closed schema gate compares the applied schema against `migration_gate_events.required_version` during runtime-context initialization (`registerServerRuntime`); a mismatch blocks application activation.
3. Configure least-privilege production credentials through server-only environment values. Include both the Cloudflare management-plane credential used to inspect R2 privacy and the R2 S3 access-key/secret credentials used by the media data plane and read-only `HeadBucket` readiness probe. Do not place credentials in command arguments, logs, fixtures, reports, or repository files.
4. Confirm the Telegram webhook and every exact Site hostname are already configured. The readiness sequence is read-only.

## Owner-gated items (dashboard/provider actions no agent can perform)

- Cloudflare R2 WORM audit: bucket `indicate-audit-worm` + lock `worm-indefinite` + `R2_AUDIT_BUCKET_NAME` (production env) selesai 2026-09-07; kredensial utama mencakup bucket ini (token scoped terpisah opsional). Redeploy production sekali agar env terbaca cron 05:00; lalu konfirmasi baris `audit_worm_export` harian di `retention_runs`.
- Per enterprise deal: sign SOW (from `docs/SOW-TEMPLATE.md`) + DPA (`docs/DPA.md`); confirm Vercel plan capacity for the new domains (PRD §23).

## Production checks

No readiness automation ships in this tree; perform each check below manually in the production environment with `NODE_ENV=production` and `SCHEMA_GATE_MODE=live`. It validates the complete Runtime Configuration and then checks:

- the applied migration sequence against `meta/_journal.json`, the `migration_gate_events.required_version` gate, and the runtime configuration snapshot version (surfaced via `GET /api/health` as `configurationVersion`);
- Supabase Auth health and PostgreSQL connectivity;
- the configured R2 bucket’s S3 `HeadBucket` data-plane health using the production media access-key/secret credentials, absence of public custom domains, and disabled managed public domain;
- Upstash connectivity;
- Telegram Bot API health and an exact configured webhook URL;
- a production-bounded cron secret without printing it;
- the one-shared-resource topology contract;
- Cloudflare-assigned and publicly delegated nameservers for all three roots;
- proxied apex and wildcard CNAME routes and Full (strict) mode;
- successful HTTPS through Cloudflare for all 12 configured apex/regional Sites;
- verified exact-domain association with the one Vercel project for all 12 Sites;
- exact active, Organization-coherent database mappings for all 12 Sites;
- Cache Components efficacy and isolation: publish/unpublish on one Site completes its `invalidation_tasks` (dispatcher: Next tags + paths + Cloudflare purge + Redis bump) and the change is visible on that Site's portal within the `minutes` cacheLife bound, while an unrelated Site's portal shows no change and no cross-host content;
- deferred delivery health: Telegram webhook replies arrive after the 200 response (no response held by Bot API latency); only `warn`-level `telegram.reply.deferred_failed` lines — never response failures — are acceptable evidence of downstream slowness;
- instant navigation smoke: client transitions between control-plane pages and portal listing/detail complete without full reload or layout shift; the header pending dot appears only on genuinely slow transitions;
- structured data: NewsArticle/Breadcrumb/Organization/WebSite JSON-LD per portal template passes Rich Results/Schema validation with no cross-tenant canonical or URL;
- platform currency: Vercel project Node.js is 22+ (20.x is rejected for new builds after Oct 2026; repo pins 24 via `.nvmrc`); the `CRON_SECRET` env equals the configured cron secret (Vercel Cron auto-sends it as Bearer auth) and both internal cron routes (`/api/internal/publishing` GET, `/api/internal/delivery/reconcile` GET/POST) respond authenticated-only; the daily `/api/health` keep-alive cron from `vercel.json` is registered (prevents Supabase Free auto-pause — do not remove while on the Free plan);
- edge protection posture: exactly one layer owns each rule — Vercel Bot Protection/WAF rulesets for portal abuse and Cloudflare Cache Rules (portal pages/feeds, Tiered Cache; never the signed media 307s) — with Cloudflare purge quota verified against publish fan-out volume.

A successful report contains only check names, `passed`, and the category `ready`. A failed report contains stable sanitized categories only. Provider bodies, tokens, signed URLs, database URLs, root identifiers, and internal errors are not emitted. Any unavailable, ambiguous, incomplete, public, mismatched, or unexpected provider response fails the check.

## Promotion procedure

1. Preserve the Release gate diagnostics and sanitized production-readiness report as release evidence.
2. Verify all nine regional matrix scenarios passed for publishing, public selection, media, SEO, cache partitioning, non-disclosing denial, analytics, Telegram status/links, and audit scoping.
3. Promote only the already-built artifact to the existing Vercel project. Do not create a second project or tenant deployment.
4. Re-run the production-readiness checks after promotion and perform bounded smoke checks against control-plane routes and configured public hosts.
5. If any post-promotion check fails, stop traffic promotion or begin rollback. Do not weaken a failed gate.

## Rollback procedure

Rollback means selecting the last schema-compatible application deployment in the same Vercel project. Before rollback, verify:

- the target application supports the currently applied schema;
- Cloudflare nameserver, DNS, wildcard, proxy, TLS, and CDN authority remains unchanged;
- no second application, project, database, bucket, Redis resource, or template will be created;
- queued publication jobs, activation attempts, invalidation tasks, cleanup tasks, transition receipts, and webhook outcomes remain durable and resumable;
- the rollback does not run destructive schema operations.

After rollback:

1. Run the production-readiness checks again.
2. Resume bounded reconcilers for durable queue, lease, activation, invalidation, and cleanup work.
3. Confirm exact public host mapping, Site isolation, media authorization, and noindex error behavior.
4. Record the sanitized failure category, release identifiers, and operational decision in the approved incident/change system. Never copy secrets or raw provider responses.

## Provider limitations and fail-closed behavior

- Provider health proves reachability and the inspected contract at check time; it does not guarantee future availability.
- Cloudflare DNS and Vercel domain APIs can be eventually consistent. Do not bypass a failure; retry after the persisted activation/reconciliation workflow converges.
- R2 privacy validation requires Cloudflare API permission to read managed and custom bucket-domain state. The separate read-only S3 `HeadBucket` data-plane probe uses the same R2 access-key/secret credentials configured for production media operations; missing, invalid, or mismatched credentials fail closed.
- Telegram exposes the webhook URL but not the configured secret token. Each check validates the server-side secret contract and exact URL.
- HTTPS checks require a Cloudflare response marker and a successful Site `robots.txt` response. Network restrictions or missing Cloudflare markers fail closed.
- No check performs a write probe against production PostgreSQL, R2, Redis, Cloudflare, Vercel, or Telegram. Write behavior is out of scope for these read-only checks.
