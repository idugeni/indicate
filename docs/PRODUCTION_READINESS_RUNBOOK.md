# Indicate Production Readiness and Rollback Runbook

## Purpose

This runbook governs the final fail-closed release check for the one shared Indicate deployment. It does not create infrastructure, activate Sites, change DNS, register wildcard domains, transfer nameservers, apply migrations, seed data, or promote a deployment. It reads configuration and provider state, then returns a sanitized pass/fail report.

Cloudflare must remain authoritative for nameservers, DNS, wildcard records, edge TLS proxying, and CDN behavior. Vercel remains application hosting with exact Site-domain associations only. One Supabase project/database/Auth instance, one private R2 bucket, one Upstash Redis resource, one Vercel project, and one public template serve all Organizations.

## Preconditions

1. Run `npm run typecheck` and `npm run lint` with zero warnings.
2. Apply all reviewed forward migrations using the direct migration credential. The application schema gate requires version 14 or newer, and this release’s local migration manifest must contain the reviewed 14-migration sequence through `0013_stage7_migration_body_digests` with every full migration-body digest verified.
3. Configure least-privilege production credentials through server-only environment values. Include both the Cloudflare management-plane credential used to inspect R2 privacy and the R2 S3 access-key/secret credentials used by the media data plane and read-only `HeadBucket` readiness probe. Do not place credentials in command arguments, logs, fixtures, reports, or repository files.
4. Confirm the Telegram webhook and every exact Site hostname are already configured. The readiness command is read-only.

## Production checks

No readiness automation ships in this tree; perform each check below manually in the production environment with `NODE_ENV=production` and `SCHEMA_GATE_MODE=live`. It validates the complete Runtime Configuration and then checks:

- the 14-entry local forward-migration manifest, full migration-body SHA-256 digests (including content after each self-registration), the exact applied migration sequence, and database schema version 14 or newer;
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
- exact active, Organization-coherent database mappings for all 12 Sites.

A successful report contains only check names, `passed`, and the category `ready`. A failed report contains stable sanitized categories only. Provider bodies, tokens, signed URLs, database URLs, root identifiers, and internal errors are not emitted. Any unavailable, ambiguous, incomplete, public, mismatched, or unexpected provider response fails the command.

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
- Telegram exposes the webhook URL but not the configured secret token. The command validates the server-side secret contract and exact URL.
- HTTPS checks require a Cloudflare response marker and a successful Site `robots.txt` response. Network restrictions or missing Cloudflare markers fail closed.
- The command performs no write probe against production PostgreSQL, R2, Redis, Cloudflare, Vercel, or Telegram. Write behavior is out of scope for this read-only command.
