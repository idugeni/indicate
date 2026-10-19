# Neon Auth + Resend + Cloudflare email delivery

## Target architecture

- **Neon Managed Auth / Better Auth** remains the source of truth for identity, sessions, verification codes, and password-reset tokens.
- **Resend** delivers Neon Auth messages through the verified INDICATE sender. The application now has a signed Neon Auth webhook endpoint at `POST /api/webhooks/neon-auth`.
- **Cloudflare DNS** remains authoritative for the domain. Keep Resend verification, DKIM, and SPF records intact. Cloudflare Email Routing is a separate inbound-mail feature and is not required for outbound authentication email.
- **Supabase must not be used** for any active authentication, verification, or password-recovery path.

## What is implemented in the application

`src/app/api/webhooks/neon-auth/route.ts`:

- Verifies Neon Auth's detached Ed25519 webhook signature against the Neon Auth JWKS.
- Rejects stale signatures, unsupported event types, malformed OTPs, and unsafe or legacy Supabase magic-link URLs.
- Sends OTP and magic-link emails through Resend using `RESEND_API_KEY` and `RESEND_DEFAULT_FROM`.
- Uses escaped HTML for user-controlled content and returns generic errors without exposing tokens, codes, credentials, or provider details.

The webhook is intentionally fail-closed. It must be registered and subscribed to the correct Neon Auth events before it receives traffic. Do not point Neon Auth to this route until it has been deployed and the production environment variables are present.

## Required production configuration

### 1. Vercel environment

For the INDICATE production project, confirm these variables exist in Production:

- `NEON_AUTH_BASE_URL` — the exact production Neon Auth base URL.
- `RESEND_API_KEY` — a Resend API key with sending permission for the verified domain.
- `RESEND_DEFAULT_FROM` — recommended: `Indicate <noreply@indicate.website>`.

The app bootstrap schema already recognizes `RESEND_API_KEY` and `RESEND_DEFAULT_FROM` as a required pair when either is set. Never commit credentials or print their values into logs.

### 2. Neon Auth webhook registration

After deploying this route to `https://indicate.website`, use the Neon Console's production branch Auth → Webhooks settings (or the corresponding Neon Auth webhook API) to register:

- Endpoint: `https://indicate.website/api/webhooks/neon-auth`
- Events: `send.otp` and `send.magic_link`

Verify that the Neon Auth configuration points at the production URL and that both events are subscribed. Neon skips its default email delivery for subscribed events, so do not enable the subscription until the endpoint is live and its Resend credentials are configured.

### 3. Cloudflare DNS and Resend

- Preserve the existing verified Resend domain records for `indicate.website`.
- Do not create a second SPF record. Merge senders into the existing SPF record if needed.
- Do not alter MX records just to enable outbound sending. Cloudflare Email Routing only handles inbound forwarding.
- The Resend account currently reports `indicate.website` and `safenca.id` as verified with sending enabled.

## End-to-end acceptance checklist

Do not call the integration complete until every item is evidenced:

1. Production Vercel variables exist (verify names and targets without exposing values).
2. The deployed webhook accepts a correctly signed Neon event and rejects unsigned, stale, and tampered requests.
3. Neon Auth production has subscriptions for both `send.otp` and `send.magic_link` pointed at the deployed endpoint.
4. A controlled test account receives an email-verification OTP through Resend and the code works once.
5. A controlled test account receives a password-reset message through Resend; the link is for the current INDICATE/Neon Auth flow and contains no `supabase.co` host.
6. The link successfully changes the password; the new password can sign in and the old one cannot.
7. Resend shows a successful delivery event for the new test. Historical emails do not prove the current delivery route.
8. A final source/config search finds no active Supabase auth endpoints, environment variables, or recovery links. Historical migration evidence must be clearly distinguished from active configuration.

## Operational notes

- The webhook sends the exact signed Neon-provided magic link so Neon Auth remains responsible for token generation and validation. It does not mint or validate auth tokens in the app.
- The webhook uses a five-minute signature freshness window. If Neon retries an event after that window, it will be rejected; monitor delivery failures and verify Neon retry semantics before enabling subscriptions in production.
- If only a custom sender is needed and branded templates are not needed, Neon also supports custom SMTP via `neon neon-auth config email-provider update --type standard`. For the webhook implementation in this repository, configure the event subscriptions above instead.
- The app's `RESEND_*` environment variables do not automatically change Neon Auth's provider. The Neon Console/API configuration is a separate required step.
