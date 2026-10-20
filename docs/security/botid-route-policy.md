# BotID route policy

## Rollout

BotID SDK is enabled with the Next.js config wrapper and browser initialization. The first protected route is `POST /api/network/newsletter`, using the Basic check level. The server checks BotID before tenant resolution, rate-limit store access, email-provider access, or subscription work.

## Explicit exclusions

Do not add these surfaces to the browser BotID protection list or apply a global bot-deny rule to them:

- `/mcp`: public tenant-scoped MCP/WebMCP transport; supports read-only tools and machine clients.
- `/.webmcp/bridge.js`: public bridge asset.
- `/api/webhooks/*`: provider callbacks; use provider signature verification and the existing origin boundary where applicable.
- `/api/internal/*`: server-to-server/cron work; retain each route's existing secret and authorization checks.
- `/api/v1/commands`: machine API; retain platform token, on-behalf ticket, origin proof, authorization, and rate limits.
- `/api/auth/*` and sign-in/sign-up/password flows: retain Neon Auth, existing Turnstile and CSRF protections. Do not wrap the catch-all auth route in a browser-only challenge because it also serves callbacks and other provider flows.
- `/api/health`, `/api/status`: preserve monitoring and availability probes.
- `/api/dashboard/*`: preserve authentication, organization/platform authorization, CSRF protections, and route-specific rate/budget controls. Add BotID only to an individually tested browser-only expensive mutation, never to the entire dashboard API namespace.

BotID is an abuse-detection layer, not authentication or authorization. It does not replace Svix/Resend signature verification, Vercel webhook signature checks, Turnstile, rate limits, tenant isolation, or RBAC.

## Validation before production rollout

1. Run `npm ci`, typecheck, lint, tests, and production build.
2. In a deployed Preview, submit the newsletter form from a normal browser and confirm it succeeds.
3. Exercise a suspected bot request from a browser test harness and confirm the route rejects it before invoking the email service.
4. Verify `POST /mcp` initialize/list/read operations, auth and password-reset flows, tenant report Turnstile, webhook signature checks, internal cron endpoints, and dashboard authorization are unchanged.
5. Inspect Vercel Firewall BotID telemetry. Do not enable a global bot-deny rule as part of this rollout; enable Deep Analysis only if the project plan supports it and measured value justifies its per-check cost.
