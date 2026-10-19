# Neon Auth + Resend + Cloudflare email delivery

## Target architecture

- **Neon Managed Auth / Better Auth** remains the source of truth for identity, sessions, email verification, and password-reset tokens.
- **Resend SMTP** delivers Neon Auth's verification and recovery messages. Neon Auth must be configured with the custom SMTP provider; setting `RESEND_API_KEY` in the application alone does not change Neon Auth's managed sender.
- **Cloudflare DNS** remains authoritative for the domain. Keep the existing Resend verification, DKIM, and SPF records intact. Cloudflare Email Routing is a separate inbound-mail feature and is not required for outbound authentication email.
- **Supabase must not be used** for any active authentication, verification, or password-recovery path.

## Neon Auth SMTP settings

Configure the production branch's Neon Auth email provider to `standard` / custom SMTP using the Resend SMTP credentials:

| Setting | Value |
| --- | --- |
| SMTP host | `smtp.resend.com` |
| Port | `465` (implicit TLS) or `587` (STARTTLS) |
| Username | `resend` |
| Password | A Resend API key with sending permission; store only in Neon Auth's secret field |
| Sender email | `noreply@indicate.website` |
| Sender name | `Indicate` |

Do not commit the API key, put it in this document, or expose it in logs. Use a dedicated Resend API key scoped to the required sending domain where available. The From address must be on a verified Resend domain.

Neon documents this configuration under **Neon Auth → Email provider** and through `neon neon-auth config email-provider update`. If the provider remains `shared`, Neon will continue sending from its default `auth@mail.myneon.app` sender.

## Production acceptance checklist

Do not mark this integration complete until every item below is evidenced:

1. Read back the production Neon Auth email-provider configuration; it must report the custom SMTP provider and the expected sender. Never print the stored password.
2. Send a provider test email to an authorized test mailbox and verify it arrives with From `Indicate <noreply@indicate.website>`.
3. Register a controlled test account and confirm the email-verification code arrives, can be used once, and leads back to `https://indicate.website`.
4. Request password recovery for that controlled account. Confirm the email arrives through Resend, its link uses the production INDICATE origin (not any `supabase.co` host), and the token can successfully set a new password.
5. Sign in with the new password and verify the previous password no longer works.
6. Inspect the latest Resend delivery event and verify successful delivery. Do not use historical email logs as evidence of the current provider.
7. Re-read Neon Auth configuration after testing and confirm the provider remains custom SMTP.
8. Search active application source, deployment configuration, and auth URLs for `supabase.co`, `SUPABASE_`, and legacy Supabase recovery endpoints. Historical records or migration notes must be clearly identified as historical, not active routes.

## Cloudflare considerations

- Do not replace or delete existing DNS records blindly. Resend's verified status should be preserved.
- Cloudflare Email Routing is for receiving/forwarding mail. Enable or modify it only when an inbound destination and the required MX/TXT records are known; it does not deliver Neon Auth's outbound verification or reset messages.
- Avoid conflicting SPF records. If the domain already has SPF, merge authorized senders into the existing record rather than creating a second SPF TXT record.
- Verify DKIM and SPF after any DNS changes. Do not change MX records merely to enable outbound Resend SMTP.

## Application-level transactional email

The app's `RESEND_API_KEY` and `RESEND_DEFAULT_FROM` variables are for application code that sends its own transactional messages. They do not automatically configure Neon Managed Auth. Keep auth delivery configured at Neon Auth and app-specific messages sent by the app; do not create a second password-reset sender that bypasses Neon Auth's token lifecycle.
