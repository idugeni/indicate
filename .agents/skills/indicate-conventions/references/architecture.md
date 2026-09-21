# Architecture reference

Source of truth: the codebase (`src/core/config/bootstrap/bootstrap-schema.ts`, `src/proxy.ts`, `src/data/migrations/meta/_journal.json`). `docs/architecture.md` summarizes; on conflict, code wins.

## Managed resources (exactly one of each by default, except templates)

| Resource | Responsibility | Boundary |
|---|---|---|
| Next.js App Router app | Dashboard, APIs, webhooks, cron handlers, ten public news templates | No tenant-specific app or build |
| Vercel project | Hosting + exact custom-domain association | No nameserver delegation, DNS authority, or wildcard registration |
| Supabase project | PostgreSQL 17 + Auth | No per-tenant project or database |
| Cloudflare | Nameservers, DNS, wildcard records, edge TLS proxy, CDN, R2, cache purge | Authority never transferred to Vercel |
| R2 bucket (private) | Media objects via S3-compatible API | No public bucket, list grants, or per-tenant buckets (a separate optional audit/WORM bucket may exist for exports) |
| Upstash Redis | Dispatch, leases, rate limits, idempotency acceleration, invalidation | Recoverable projection, never durable authority |

## Dependency direction

```
src/app/ → src/modules/ → src/core/ + ports ← src/integrations/
                                     ↘ src/data/ (persistence)
```

## Directory map

- `src/app/` — routing only. Route groups `(site)` (Dashboard host landing), `(network)` (tenant public content), `(auth)`, `(dashboard)` (editorial Dashboard), `api/` (health, v1, dashboard, internal, leads, network, webhooks), plus `domain-pending/`, `tg/`, and machine-readable surfaces (`llms.txt/`, `robots.txt/`, `rss.xml/`, `sitemap.xml/`, `news-sitemap.xml/`). No underscore composition roots; services wire directly in route handlers via shared modules.
- `src/modules/<capability>/` — `audit`, `auth`, `billing`, `content`, `dashboard`, `delivery`, `integrations`, `moderation`, `persisted-config`, `publishing`, `site`. Only `dashboard`, `delivery`, and `integrations` expose a barrel `index.ts`; import other modules by file path.
- `src/integrations/<provider>/` — `supabase`, `storage` (R2 adapter), `redis`, `telegram`, `cloudflare` (API v4: zones, purge_cache, SSL), `vercel` (exact-domain API), `email` (Resend). Server-only.
- `src/core/` — `config/` (runtime schema, public config, runtime context, persisted parser, bootstrap), errors, operation context, hostname normalization, observability, routing, security, system, transactions.
- `src/data/` — `schema/`, `client.ts` (singleton; pooled URL runtime, direct URL migrations), `repos/`, `migrations/`.
- `src/components/ui/` — shadcn/ui; `src/ui/` — `cn` helper alias.

## Key behavioral rules

- Adapters (Dashboard, API, Telegram, background, reconciliation) invoke shared application services; no tenant SQL or duplicated business rules in adapters.
- Record durable intent in Postgres first; external effects after, resumable/bounded/idempotent.
- Publication acceptance is transactional and Organization-scoped by Idempotency Key + canonical Request Fingerprint.
- Next.js 16 conventions: `src/proxy.ts` for hostname routing, `instrumentation.ts` registers runtime context, `typedEnv` enabled.
