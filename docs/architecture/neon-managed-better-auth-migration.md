# Neon Managed Better Auth migration

## Status

Planning and compatibility contract only. This document does **not** switch production authentication. The existing Supabase Auth path remains authoritative until the implementation and cutover gates below pass.

## Verified starting state

- Neon project: `Indicate`, production branch `production`.
- Neon Managed Auth provider: Better Auth.
- Neon Auth tables exist under `neon_auth`, but the user, account, and session tables were empty at the last read-only inspection.
- The application currently uses `@supabase/ssr` and `@supabase/supabase-js` for browser sign-in, server-validated cookie sessions, callback exchange, and recovery.
- The application database and authorization records remain on the existing database path. Neon Auth is currently not the application's identity provider.
- Dashboard access-key authentication and Upstash Redis are independent capabilities and must remain intact.

## Target architecture

Neon Managed Better Auth becomes the authentication and session authority. The existing application database remains the source of truth for application users, organization memberships, tenant roles, permissions, superadmin privileges, and audit records. The authenticated Neon user ID is mapped to a local identity using an explicit, unique identity mapping; email alone must not grant access or silently attach an existing account.

The change must not move application data or replace Upstash Redis as part of the authentication cutover.

## Required implementation work

1. Add the pinned Neon Auth SDK dependency and lockfile change after confirming the API against the current official Next.js SDK documentation.
2. Add server and browser auth clients using `@neondatabase/auth/next/server` and `@neondatabase/auth/next`. Keep secrets server-only; validate `NEON_AUTH_BASE_URL` and a 32+ character `NEON_AUTH_COOKIE_SECRET` at bootstrap.
3. Implement a single server-side session-verification adapter consumed by dashboard authentication, route handlers, middleware/proxy checks, and server components. Never authorize from client-provided user metadata.
4. Replace Supabase-specific sign-in, sign-up, Google OAuth, sign-out, email verification, forgot-password, and update-password operations with supported Neon Auth operations. Keep the existing custom UI, Turnstile protections, consent capture, redirect allowlisting, error telemetry, and welcome-email behavior.
5. Rework the auth callback route for Neon Managed Auth's actual callback behavior. Do not retain assumptions about Supabase PKCE parameters or token-hash types.
6. Preserve the local-user mapping and all authorization invariants: active local user, live organization membership, role/permission checks, superadmin controls, and access-key actors.
7. Implement explicit existing-account migration. Prove credential import compatibility first; otherwise use a verified recovery/re-enrollment path. Never auto-link accounts based only on matching email. Handle the previously observed legacy cohort lacking Supabase identity rows as a distinct migration case.
8. Add tests for valid/expired/revoked sessions, unlinked identities, inactive users, missing/revoked tenant membership, cross-tenant access, superadmin access, access-key fallback, OAuth callback failures, email recovery, and session cookie security.
9. Update deployment environment documentation and Vercel environment variables only after code and test gates pass. Add the production hostname and required callback origins to Neon Auth's trusted-domain allowlist using the Neon MCP, after confirming the exact deployed hostnames and redirect requirements.
10. Remove Supabase Auth dependencies and auth environment requirements only after every Supabase Auth call site is gone and production cutover has been validated. Supabase database usage, if still needed, is a separate decision and must not be removed accidentally.

## Security and rollout gates

- No production auth provider switch while Neon Auth has no migrated users.
- No destructive SQL or deletion of Supabase Auth users/sessions as part of this PR.
- No secrets in source control, PR text, logs, or browser-visible environment variables.
- Do not broaden trusted origins to wildcards.
- Keep the existing login path working until a verified migration and rollback plan exists.
- Verify with typecheck, lint, focused auth tests, the full test suite, and a production build.
- Run end-to-end checks against a non-production Neon branch before changing production configuration.
- Document a rollback path that restores Supabase Auth without losing local authorization state.

## Acceptance criteria

- All auth entry points use Neon Managed Better Auth; no Supabase Auth session is required for dashboard access.
- Existing users have a documented, tested migration path and are not silently locked out.
- Existing local identities, tenant RBAC, superadmin, access keys, and audit behavior remain correct.
- No auth secrets are exposed to the client.
- CI and auth regression tests pass.
- Production configuration changes are applied and verified separately from the code PR, with a rollback plan.
