# Design reference

Visual authority lives in code (no separate design document): tokens and base
styles in `src/app/globals.css`, primitives in `src/components/ui/` (per
`components.json`), tenant templates under `src/modules/site/components/`.
Every visual decision by human or agent must trace back to these.

## Character

Broadcast control-room at night: **tenang, presisi, editorial**. A senior broadcast operator, not a consumer app. Trustworthy, technical, human (the content is real journalism).

Conflict resolution order: (1) clarity of status/data, (2) token consistency, (3) editorial-technical feel, (4) free visual expression.

## Tokens (abridged — read the doc for the full contract)

- Dark indigo surfaces differentiated by background color + hairline borders (no soft-shadow white cards everywhere).
- Solid brass as the single bold accent (no blue-purple gradients).
- Fraunces for editorial moments, Plex Sans for interface, Plex Mono for exact data (`100/100`, never "hampir semua").
- Small radii (3–4px) consistently; no pill shapes.
- Subtle interaction; only the signal-network hero may carry the main animation moment.
- Charts/reporting: exact numbers, auditable states (proof-of-display, logs, clear statuses).

## Rules for agents

- New pattern needed? Match the closest existing in-code pattern — do not improvise a new visual language.
- shadcn/ui implementation per `components.json` aliases (`@/components/ui`, `@/ui/cn`); Radix primitives; `optimizePackageImports` list in `next.config.ts` is the import-cost allowlist — keep it in sync when adding Radix packages.
- Public tenant branding/settings come from the exact Site context (ten public news templates via the network dispatcher), never from per-tenant builds.
- Applies alongside the `stop-slop`, `frontend-design`, `web-design-guidelines`, and `theme-factory` skills; this file wins on project-specific tokens.
