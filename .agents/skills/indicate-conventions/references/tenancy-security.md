# Multi-tenancy and security reference

## Hostname routing (`proxy.ts`)

Control-plane matching precedes public Site lookup. A candidate that normalizes to a reserved hostname is rejected before public activation.

- Dashboard host (`indicate.web.id`) → control-plane pages, auth callbacks.
- API host → versioned v1 API surface.
- Webhook host → named webhook routes (Telegram, generic), guarded by `trustedCloudflareSource` + origin secret.
- Public tenant hosts → exact-match resolution to one Site. Regional hostnames take the one-label form `{regionSlug}.{rootDomain}`.

## Tenant isolation rules

- Exact equality only: normalized hostname must equal one reserved surface or one unique active Site. No fallback tenant; reject missing, malformed, ambiguous, unauthorized, suffix-only, or substring-only candidates.
- Every tenant entity, relationship, query, mutation, job, object authorization, cache namespace, aggregate, and audit event preserves Organization ownership.
- Every tenant operation derives exactly one authorized `organizationId` from a verified actor or claimed durable record.
- Canonical article content exists once; `article_sites` holds destination assignment + outcome, never a copy of title/body.
- Public rendering, URL generation, SEO, media access, analytics attribution, and cache identity derive from the same Hostname Context.

## Security invariants

- RLS enforced at PostgreSQL level with dedicated non-owner, non-`BYPASSRLS` `indicate_runtime` role; tenant RLS enabled and forced. Supabase Auth = identity only; authorization = Membership/Role/Permission rows.
- Server-only enforcement via the `server-only` package: server modules throw at build time if bundled into client components.
- Secrets (API tokens, R2 credentials, origin secrets) live in server-only env storage. Never emit them in browser bundles, logs, fixtures, or error responses; never include internal diagnostics or audit context in public errors.
- Deny without disclosure: missing, malformed, or unauthorized inputs get non-disclosing denials.
- Audit logs are insert-only; security-sensitive DB changes and required audit rows commit atomically.
- Webhook authenticity: verify via `trustedCloudflareSource` (origin secret), constant-time secret comparison (`isSecretEqual`).
