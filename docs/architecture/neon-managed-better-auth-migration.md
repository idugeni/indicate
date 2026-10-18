# INDICATE — Neon PostgreSQL and Managed Auth architecture

## Authoritative services

- **Neon PostgreSQL** is the sole application database, accessed through the existing Drizzle and `postgres` data layer.
- **Neon Managed Auth (Better Auth)** is the sole interactive email/password authentication and session provider.
- The app-owned schema remains authoritative for local user status, organizations, memberships, roles, tenant permissions, platform/super-admin grants, audit records, and application settings.
- **Cloudflare R2** provides media/object storage. **Upstash Redis** is an acceleration layer for queues, cache, rate limits, and the separate dashboard access-key capability. Neither is a database or identity authority.
- Vercel hosts the Next.js application. Cloudflare remains authoritative for DNS, CDN, and edge TLS. Resend is the transactional email provider when configured.
- Google credentials used for operator/search tooling are not interactive application sign-in credentials.

## Identity and authorization contract

A Neon session proves the provider identity; it does not grant organization access by itself. Every dashboard request must resolve the verified Neon user ID to a local application user and enforce active-user status, active membership, role, tenant scope, and platform permissions. Dashboard access-key actors continue through their separate signed-cookie/Redis-backed path.

Identity linking must require a verified Neon Auth session, `emailVerified === true`, one case-normalized match to an active local user, an unclaimed `neon_auth_user_id`, and a transaction-local identity-link intent. Conflicting links must fail closed and produce an auditable result.

## Production cutover record — 2026-10-18

- Production branch: Neon branch `production` in `AWS ap-southeast-1`.
- The production database connection and Neon Auth endpoint are aligned to the same branch.
- The production database no longer contains the former provider schemas `auth`, `storage`, `realtime`, or `supabase_migrations`.
- Current verified counts: 63 Neon Auth identities, 61 local application profiles, and 61 identity-link audit records.
- The production health endpoint returned `status: ok` and reported configuration sourced from PostgreSQL.
- A protected recovery branch, `pre-cutover-restored-snapshot-2026-10-18`, remains available for investigation; it is not an automatic rollback.

## Verification still required

The database cutover and health check do not prove an end-to-end user login. Before declaring authentication fully validated, test with an approved test account: password recovery email delivery, password update, sign-in, session persistence, logout, access-key login, Super Admin permissions, organization memberships, RBAC, and tenant isolation. Do not set a shared password for existing users.

## Security invariants

- Provider identity alone never grants application authorization.
- Database access uses least-privilege runtime credentials; direct credentials are reserved for migrations and administration.
- Secrets remain server-side and are not logged.
- Redis is not durable authority for users, permissions, or audit records.
- Recovery and access-key login remain separate flows with independent verification.
