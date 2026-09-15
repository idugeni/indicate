# Indicate Production Readiness and Rollback Runbook (advisory — relaxed 2026-09-14)

## Purpose

This runbook is a recommended release checklist for the one shared Indicate deployment, not a hard gate. It does not create infrastructure, activate Sites, change DNS, register wildcard domains, transfer nameservers, apply migrations, seed data, or promote a deployment. It reads configuration and provider state, then returns a sanitized pass/warn report. Failed checks warn; promotion may proceed with owner sign-off and a recorded risk note.

Cloudflare must remain authoritative for nameservers, DNS, wildcard records, edge TLS proxying, and CDN behavior. Vercel remains application hosting with exact Site-domain associations only. One Supabase project/database/Auth instance, one private R2 bucket, one Upstash Redis resource, one Vercel project, and one public template serve all Organizations.

## Preconditions (recommended)

1. Run `npm run typecheck` and `npm run lint` — warnings should be zero, but non-zero output warns rather than blocks in relaxed mode.
2. Apply all reviewed forward migrations using the direct migration credential, in the order recorded by Drizzle's `src/data/migrations/meta/_journal.json`. The schema gate compares the applied schema against `migration_gate_events.required_version` during runtime-context initialization (`registerServerRuntime`); a mismatch warns rather than blocks activation in relaxed mode.
3. Configure least-privilege production credentials through server-only environment values. Include both the Cloudflare management-plane credential used to inspect R2 privacy and the R2 S3 access-key/secret credentials used by the media data plane and read-only `HeadBucket` readiness probe. Do not place credentials in command arguments, logs, fixtures, reports, or repository files.
4. Confirm the Telegram webhook and every exact Site hostname are already configured. The readiness sequence is read-only.

## Owner-gated items (dashboard/provider actions no agent can perform)

- Cloudflare R2 WORM audit: bucket `indicate-audit-worm` + lock `worm-indefinite` + `R2_AUDIT_BUCKET_NAME` (production env) selesai 2026-09-07; kredensial utama mencakup bucket ini (token scoped terpisah opsional). Redeploy production sekali agar env terbaca cron 05:00; lalu konfirmasi baris `audit_worm_export` harian di `retention_runs`.
- Per enterprise deal: sign SOW (from `docs/templates/SOW-TEMPLATE.md`) + DPA (`docs/DPA.md`); confirm Vercel plan capacity for the new domains (PRD §23).

## Production checks

No readiness automation ships in this tree; perform each check below manually in the production environment with `NODE_ENV=production`. It validates the complete Runtime Configuration and then checks:

- the applied migration sequence against `meta/_journal.json`, the `migration_gate_events.required_version` gate, and the runtime configuration snapshot version (surfaced via `GET /api/health` as `configurationVersion`);
- Supabase Auth health and PostgreSQL connectivity;
- the configured R2 bucket’s S3 `HeadBucket` data-plane health using the production media access-key/secret credentials, absence of public custom domains, and disabled managed public domain;
- Upstash connectivity;
- Telegram Bot API health and an exact configured webhook URL;
- a production-bounded cron secret without printing it;
- the one-shared-resource topology contract;
- Cloudflare-assigned and publicly delegated nameservers for every configured root domain (enumerated live, never a fixed count);
- proxied apex and wildcard CNAME routes and Full (strict) mode;
- successful HTTPS through Cloudflare for every configured apex/regional Site (enumerated live from active Sites, never a fixed count);
- verified exact-domain association with the one Vercel project for every configured Site;
- exact active, Organization-coherent database mappings for every configured Site;
- Cache Components efficacy and isolation: publish/unpublish on one Site completes its `invalidation_tasks` (dispatcher: Next tags + paths + Cloudflare purge + Redis bump) and the change is visible on that Site's portal within the `minutes` cacheLife bound, while an unrelated Site's portal shows no change and no cross-host content;
- deferred delivery health: Telegram webhook replies arrive after the 200 response (no response held by Bot API latency); only `warn`-level `telegram.reply.deferred_failed` lines — never response failures — are acceptable evidence of downstream slowness;
- instant navigation smoke: client transitions between control-plane pages and portal listing/detail complete without full reload or layout shift; the header pending dot appears only on genuinely slow transitions;
- structured data: NewsArticle/Breadcrumb/Organization/WebSite JSON-LD per portal template passes Rich Results/Schema validation with no cross-tenant canonical or URL;
- platform currency: Vercel project Node.js is 24 (repo pins 24 via `.nvmrc`); the `CRON_SECRET` env equals the configured cron secret (Vercel Cron auto-sends it as Bearer auth) and both internal cron routes (`/api/internal/publishing` GET, `/api/internal/delivery/reconcile` GET/POST) respond authenticated-only; the daily `/api/health` keep-alive cron from `vercel.json` is registered (prevents Supabase Free auto-pause — do not remove while on the Free plan);
- edge protection posture: exactly one layer owns each rule — Vercel Bot Protection/WAF rulesets for portal abuse and Cloudflare Cache Rules (portal pages/feeds, Tiered Cache; never the signed media 307s) — with Cloudflare purge quota verified against publish fan-out volume.

A successful report contains only check names, `passed`, and the category `ready`. A failed report contains stable sanitized categories only. Provider bodies, tokens, signed URLs, database URLs, root identifiers, and internal errors are not emitted. Any unavailable, ambiguous, incomplete, public, mismatched, or unexpected provider response warns (advisory) rather than hard-fails the check in relaxed mode.

## Promotion procedure (advisory)

1. Preserve the Release gate diagnostics and sanitized production-readiness report as release evidence.
2. Verify regional matrix scenarios for publishing, public selection, media, SEO, cache partitioning, non-disclosing denial, analytics, Telegram status/links, and audit scoping when practical.
3. Promote the already-built artifact to the existing Vercel project by default; a second project needs explicit owner approval.
4. Re-run the production-readiness checks after promotion and perform bounded smoke checks against control-plane routes and configured public hosts.
5. If any post-promotion check fails, assess the risk with the owner; stopping traffic or rollback is recommended, not mandatory. Record any decision to proceed despite warnings.

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

## Provider limitations and advisory behavior (relaxed)

- Provider health proves reachability and the inspected contract at check time; it does not guarantee future availability.
- Cloudflare DNS and Vercel domain APIs can be eventually consistent. Retry after the persisted activation/reconciliation workflow converges; bypassing a failure needs owner sign-off.
- R2 privacy validation requires Cloudflare API permission to read managed and custom bucket-domain state. The separate read-only S3 `HeadBucket` data-plane probe uses the same R2 access-key/secret credentials configured for production media operations; missing, invalid, or mismatched credentials warn (not hard-fail) in relaxed mode.
- Telegram exposes the webhook URL but not the configured secret token. Each check validates the server-side secret contract and exact URL.
- HTTPS checks require a Cloudflare response marker and a successful Site `robots.txt` response. Network restrictions or missing Cloudflare markers warn in relaxed mode.
- No check performs a write probe against production PostgreSQL, R2, Redis, Cloudflare, Vercel, or Telegram. Write behavior is out of scope for these read-only checks.
