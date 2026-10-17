# Full Neon migration: PostgreSQL and Managed Better Auth

## Scope

This PR moves INDICATE's application database and authentication/session provider to Neon. It is not an auth-only integration and does not switch production while this branch is under validation.

Target architecture:

- **Neon PostgreSQL** is the sole application database, connected through the existing Drizzle and `postgres` data layer.
- **Neon Managed Auth (Better Auth)** is the sole interactive email/password authentication and session provider.
- The app's own tables remain authoritative for local user status, organizations, memberships, roles, tenant permissions, platform/super-admin grants, audit records, and application settings.
- **Upstash Redis**, Cloudflare, Vercel, R2, Resend, and the separate dashboard access-key capability remain independent and are not replaced by the Neon migration.
- Google is not an interactive app sign-in provider in this target; any Google credentials used for operator/search tooling are separate.

## Verified starting state

- Neon project `Indicate`, production branch `production`, region `AWS ap-southeast-1`.
- Neon Managed Auth was enabled, but the `neon_auth` user/account/session cohort was empty at the last read-only inspection.
- The application used a PostgreSQL/Drizzle layer and Supabase-specific bootstrap validation and identity/session adapters.
- The application database import to Neon was previously checked for table, column, trigger, index, RLS-policy, and migration-journal counts. One import operation reported a failure, so this is evidence of progress, not proof of a clean production cutover.
- The production deployment must remain on its currently verified provider until the gates below are passed.

## Identity and authorization contract

A Neon session proves only the provider identity. It does not grant organization access on its own. For each dashboard request, the application must resolve the verified Neon user ID to its local user record and then apply the existing active-user, active-membership, role, tenant-scope, and platform-permission checks. Dashboard access-key actors continue through their separate signed-cookie/Redis-backed path.

Email equality must never silently link a migrated account. Existing identity migration must use a documented, unique mapping from the old provider identity to the new Neon user ID, or require an explicitly verified recovery/re-enrollment flow. Any user whose old identity row is missing needs a separately handled migration case.

## Implementation and rollout gates

1. Route email/password sign-in, signup, email verification callback, password recovery, password reset, and sign-out through Neon Managed Auth. Interactive Google sign-in is removed.
2. Use a single server-side Neon session adapter for dashboard authentication. Do not authorize from browser-selected local user IDs or unverified client metadata.
3. Keep the local authorization repository and all tenant/RBAC/super-admin/access-key invariants unchanged.
4. Require a server-only `NEON_AUTH_COOKIE_SECRET` of at least 32 characters, and validate the Neon Auth URL and production Neon PostgreSQL hostname at bootstrap.
5. Keep Turnstile verification server-side on email sign-in, signup, and password-recovery requests whenever the auth challenge is configured. Missing server-side challenge configuration must fail closed in production.
6. Replace Supabase-specific connection assumptions, SDK integrations, environment requirements, callback parameters, auth templates, and backup workflow with Neon equivalents. A transitive library used internally by the Neon SDK does not represent an app dependency on the Supabase service.
7. Regenerate `package-lock.json` from `package.json`; do not hand-maintain the dependency graph. The lockfile, typecheck, lint, focused auth tests, full test suite, and production build must pass.
8. Prove the Neon application database is complete on the target branch, including required extensions, SQL functions referenced by policies, triggers, indexes, constraints, and migration journal. Investigate and close the previously reported import failure.
9. Prove a supported existing-account credential migration path. If password hashes cannot safely be imported, require a verified reset/re-enrollment plan and communicate it before cutover. Never assume an empty `neon_auth` user table can serve existing users.
10. Run integration checks on a non-production Neon branch: verified/unverified/expired sessions, reset-token expiry, linked and unlinked identities, inactive local accounts, revoked memberships, cross-tenant requests, super-admin, dashboard access keys, cookie flags, Turnstile failure/outage, and email delivery.
11. Update trusted origins and deployment variables only after the exact production hostnames and callback URLs are confirmed. Do not broaden trusted origins to wildcards.
12. Keep rollback available until the Neon cutover is verified. Do not delete the prior database/provider project or its backups as part of code review alone.

## Acceptance criteria

- Application runtime connects to Neon PostgreSQL and does not require Supabase database connection URLs or Supabase JS/SSR packages.
- Interactive email/password auth, verified sessions, signup, recovery/reset, and sign-out use Neon Managed Auth.
- No Supabase session is required for any dashboard request.
- Existing local users, organization membership/RBAC, platform super-admin, access-key authentication, audit behavior, and data integrity are preserved.
- No auth secret is exposed to client-side environment variables or source control.
- Dependency lockfile is generated by npm and CI gates pass.
- Production environment cutover is performed only after database and account migration are verified, with a tested rollback plan.

## Current branch state

This document defines the target and gates; the presence of this file or the initial code changes is not proof that all gates passed. Use the live PR checks and the remaining file-level audit to determine readiness. Do not mark the PR ready or merge it while any migration, test, CI, data-integrity, or production-account-migration gate remains unresolved.
