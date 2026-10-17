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
- Neon Managed Auth (Better Auth) is now provisioned on the Neon `production` branch. The trusted origin `https://indicate.website` is configured. The Neon Auth user/account/session cohort was empty at provisioning time; existing accounts therefore still require verified first-login linking or recovery.
- The application used a PostgreSQL/Drizzle layer and Supabase-specific bootstrap validation and identity/session adapters.
- The application database import to Neon was previously checked for table, column, trigger, index, RLS-policy, and migration-journal counts. One import operation reported a failure, so this is evidence of progress, not proof of a clean production cutover.
- The production deployment must remain on its currently verified provider until the gates below are passed.

## Identity and authorization contract

A Neon session proves only the provider identity. It does not grant organization access on its own. For each dashboard request, the application must resolve the verified Neon user ID to its local user record and then apply the existing active-user, active-membership, role, tenant-scope, and platform-permission checks. Dashboard access-key actors continue through their separate signed-cookie/Redis-backed path.

Email equality alone must never link a migrated account. The implemented mapping path requires a Neon Auth session with `emailVerified === true`, a single case-normalized match to an active local user, an unclaimed `neon_auth_user_id`, and a transaction-local identity-link intent. It preserves the local user ID, memberships, roles, and access keys; ambiguous matches, inactive accounts, or accounts already linked to another Neon identity fail closed. Each successful link is recorded in the global `identity_link_audit_logs` table and audit-logged for every active membership. New emails create a local user without inheriting any existing tenant membership. Neon Auth is configured to require email verification and send verification messages on signup and sign-in.

## Implementation and rollout gates

1. Route email/password sign-in, signup, email verification callback, password recovery, password reset, and sign-out through Neon Managed Auth. Interactive Google sign-in is removed.
2. Use a single server-side Neon session adapter for dashboard authentication. Do not authorize from browser-selected local user IDs or unverified client metadata.
3. Keep the local authorization repository and all tenant/RBAC/super-admin/access-key invariants unchanged.
4. Require a server-only `NEON_AUTH_COOKIE_SECRET` of at least 32 characters, and validate the Neon Auth URL and production Neon PostgreSQL hostname at bootstrap.
5. Keep Turnstile verification server-side on email sign-in, signup, and password-recovery requests whenever the auth challenge is configured. Missing server-side challenge configuration must fail closed in production.
6. Replace Supabase-specific connection assumptions, SDK integrations, environment requirements, callback parameters, auth templates, and backup workflow with Neon equivalents. A transitive library used internally by the Neon SDK does not represent an app dependency on the Supabase service.
7. Regenerate `package-lock.json` from `package.json`; do not hand-maintain the dependency graph. The lockfile, migration digest/bootstrap checks, typecheck, lint, focused auth tests, full test suite, and production build must pass.
8. Prove the Neon application database is complete on the target branch, including required extensions, SQL functions referenced by policies, triggers, indexes, constraints, and migration journal. Investigate and close the previously reported import failure.
9. The local-account mapping migration adds a separate `neon_auth_user_id` field while retaining legacy IDs for rollback. Prove the verified first-login/recovery path and determine whether existing passwords can be imported safely. If not, require verified reset/re-enrollment before cutover. Never assume an empty `neon_auth` user table can serve existing users.
10. Run integration checks on a non-production Neon branch: verified/unverified/expired sessions, reset-token expiry, linked and unlinked identities, inactive local accounts, revoked memberships, cross-tenant requests, super-admin, dashboard access keys, cookie flags, Turnstile failure/outage, and email delivery.
11. The production trusted origin is currently `https://indicate.website`. `verify_email_on_sign_up`, `verify_email_on_sign_in`, and `require_email_verification` are enabled in `neon_auth.project_config`; the config was read back and verified after the update. Add the production `NEON_AUTH_BASE_URL` and a generated `NEON_AUTH_COOKIE_SECRET` to the deployment environment after the code is approved. Do not broaden trusted origins to wildcards.
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

The branch now removes the Supabase integration directory, Supabase environment examples, Supabase backup workflow, and Supabase package dependencies. It also adds a versioned migration for Neon identity linkage and introduces `neon_project_id` while retaining the legacy `supabase_project_ref` projection during the deployment window so the currently live app remains compatible until the Neon build takes over. Historical migration files and imported legacy Supabase schemas are retained as migration history/rollback evidence; they are not runtime dependencies. This is not proof of production cutover. Keep the PR draft until CI, Neon email-verification settings, migration checks, and the existing-account end-to-end flow are verified.
