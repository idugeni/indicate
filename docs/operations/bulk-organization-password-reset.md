# Bulk organization password recovery

Use the bulk runner to initiate password recovery for active users linked to active customer organizations in the production Neon database. It sends one Neon Auth reset email per unique eligible email address; it does not create a shared password, expose passwords, or modify password hashes.

## Run

Set `DATABASE_DIRECT_URL` (or `DATABASE_POOL_URL`), `NEON_AUTH_BASE_URL`, and optionally `NEXT_PUBLIC_SITE_URL` in the trusted operator environment. Do not commit credentials or put them in command-line arguments.

First run the dry-run:

```sh
node scripts/auth/bulk-organization-password-reset.mjs
```

Review the eligible account count. Then initiate the batch:

```sh
node scripts/auth/bulk-organization-password-reset.mjs --execute
```

The script sends requests sequentially, reports aggregate successes/errors without printing email addresses, and exits non-zero if any request fails. A successful HTTP response means Neon Auth accepted the reset request, not that the recipient received or completed it. Verify SMTP delivery and complete an end-to-end sign-in test before declaring the rollout complete.

The redirect is intentionally restricted to `https://indicate.website/update-password`. This runner only targets users with active memberships, active user status, an email address, and a linked Neon Auth identity.
