# Neon Auth production cutover record

**Date:** 2026-10-18  
**Application:** INDICATE  
**Authoritative database:** Neon PostgreSQL, branch `production`  
**Authoritative interactive identity/session provider:** Neon Managed Auth (Better Auth)

## Verified production state

- Legacy PostgreSQL schemas `auth`, `storage`, `realtime`, and `supabase_migrations` were removed from the production database after dependency inspection.
- `public.users` retains 61 application profiles.
- `neon_auth.user` contains 63 identities.
- `public.identity_link_audit_logs` retains 61 identity-link audit records.
- The application database connection and Neon Auth endpoint are configured for the same production branch.
- `https://indicate.website/api/health` returned `status: ok`, with configuration loaded from PostgreSQL.

## Account onboarding limitation

The identity records exist, but this cutover did not verify a real authenticated sign-in or end-to-end recovery email/password update. Do not treat account login as fully validated until the recovery flow and a real test account have passed sign-in, session persistence, logout, and recovery checks. Never assign a shared password.

## Rollback

A protected Neon branch named `pre-cutover-restored-snapshot-2026-10-18` is retained for recovery investigation. It is a separate branch and does not automatically roll production back. Evaluate any restore carefully against writes made after the snapshot.

## Operational contract

- Neon PostgreSQL is the only application database.
- Neon Managed Auth is the only interactive email/password identity and session provider.
- Application-owned user, organization, membership, role, permission, tenant, and audit data remains in the application schema.
- Media uses the configured Cloudflare R2 integration; caching/queue acceleration uses Upstash Redis.
- Keep account recovery and access-key login as separate, explicitly tested authentication paths.
