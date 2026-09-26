# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Applied database work is keyed to the migration ledger rather than to a release
number, because the schema is the thing that has to stay ordered. A `vNNN`
marker in an entry names the ledger version that carried it; the ledger itself
is `src/data/migrations/meta/_journal.json`. Releases below this section are
npm-facing.

## [Unreleased]

### Added

- Facebook card pre-warm sweep: an hourly cron hands one bounded batch of tenant
  homepages to Meta's scrape endpoint, and a Redis cursor carries the fleet
  position between runs. Apex portals are swept before region and city hosts. A
  Meta app-level rejection halts the batch and leaves the cursor on the
  unattempted host. See `docs/architecture.md` §12.6.
- Crawler access to the tenant media surface: `robots.txt` now carves
  `/api/network/media/` out of the `/api/` catch-all, because it is the only
  crawler-facing image surface. A blocked prefix made `facebookexternalhit` refuse
  the fetch and report every cover, gallery image, and tenant card as a
  corrupted image.
- `docs/architecture-policy.md` — owner relaxations, decision boundaries, and the
  2026-08-30 approval record, split out of `docs/architecture.md` so sections 1-20
  read as the only binding design.
- `scripts/qa/doc-citations.mjs` — resolves every `file:line` source citation in
  prose and fails on a missing file, a line past end-of-file, a blank target
  line, or a citation with no repo-relative root. Runs in the CI `docs` job as
  `npm run lint:md:citations`.
- Manual subscription regime: `CustomerService.platform()` honors
  `platform.super_admin` (completing the documented `customer.admin` transition;
  nav follows the canonical grant), plus a platform-only "Langganan manual" card
  in BillingPanel (plan + status + optional end date, NULL period = immune to
  the daily sweep). `platform.content.manage` is granted to the platform admin.
- Single-price manual billing (v136-v137): Rp550.000 incl PPN pinned by
  schema/service/DB; invoice numbers follow the paid month; `invoice.reissue` for
  voided invoices; subscription/invoice Telegram routes run as the sole platform
  admin with a `telegram` audit entry point; unlimited subscription until an
  admin suspends or cancels via dashboard, API, or Telegram Mini App.
- Clickwrap consent on billing orders (`termsAccepted` + `TERMS_VERSION=2026-09-05`,
  checkbox UI with a 12-month cap summary).
- DCO `Signed-off-by` requirement plus an origin/license checklist in the PR
  template.
- `THIRD-PARTY-NOTICES.md` — upstream attributions (Radix/Base UI/shadcn/Lucide/
  react-icons, Fraunces/IBM Plex OFL, sharp LGPL, lightningcss MPL) plus a
  trademark disclaimer.
- `LICENSE` — Apache License 2.0 (Copyright 2026 Eliyanto Sarage).
- `SECURITY.md` — vulnerability reporting, secret handling, and promotion-safety
  policy.
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 community standards.
- `SUPPORT.md` — help channels, issue requirements, and supported setup.
- `CLAUDE.md` — AI assistant context and project conventions.
- `CONTRIBUTING.md` — development workflow and contribution guidelines.
- `CHANGELOG.md` — project change history.
- `docs/plans/audit-remediation-2026-09-24.md` — 6-phase remediation plan from the
  2026-09-24 six-area audit.
- `.github/PULL_REQUEST_TEMPLATE.md` — gate evidence plus tenant-isolation,
  migration, and security checklists.
- `.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml` (+ `config.yml`
  routing security reports privately).
- `.github/CODEOWNERS` and `.github/dependabot.yml` (weekly npm + GitHub Actions
  updates).
- README links to Contributing, Security, Support, Code of Conduct, Changelog, and
  License.
- Fase B legal-hardening (live v68-v70): `orders.terms_version` /
  `orders.terms_accepted_at` persisted via the 6-arg `billing_order_create` (the
  5-arg shim fails closed); `refunded` order status with platform-only
  `billing_order_refund` plus an `active-orders` listing, refund UI, and a 14-day
  refund SOP in Terms §6-§7; Terms §9 / FAQ-5 synced to the real
  grace to past-due to suspended machine.
- History sync (live v71): registered `enterprise_lead_list` (was live without a
  history row); completed `meta/_journal.json` to 71/71 file-entry parity.
- Digest re-baseline (live v72-v73): 10 drifted history checksums re-baselined
  after live-object verification; 2 malformed literals corrected; file literals
  updated for triple consistency (recompute == literal == live).
- Fase C (live v74-v75): audit hash-chain (HMAC Vault, DB clock, nightly verify
  cron) with 9/9 healthy; retention sweep (4 categories, nightly cron) with proof
  rows; Telegram-ID pseudonymization in audit; Privacy §10/§13 updated.
- Fase D (live v76): content reports (public `/report` page plus a rate-limited
  intake API, dashboard Moderation view with an SLA note) and DSAR tickets
  (`DSAR-YYYY-XXXXXXXX`, dashboard submit/track/decide), plus media
  license/attribution columns; Terms §14 (1x24h takedown procedure), Privacy §15
  (tickets), FAQ-13, `docs/dpa.md` template; Cloudflare 429 surfaced distinctly;
  rate-limit failure modes documented.
- Pending-queue clearance (live v79-v85, v87):
  - litigation holds (`litigation_holds` plus an `is_org_held` guard inside
    `retention_sweep`, moderated via dashboard);
  - full org erasure worker (`org_erasure_requests` + `erasure_sweep`, PII
    anonymization, R2 re-queue, legal archives kept, nightly cron);
  - RLS global-NULL SELECT tightening on the three rollout tables plus an
    `audit_worm_fetch` allowlist reader;
  - repaired missing EXECUTE grants, including the v78 claim function;
  - Telegram outbox with 429-aware backoff, platform broadcast, and daily drain;
  - public enterprise-lead intake (`/api/leads`, pricing form) and a
    Telegram-linking consent trail (`lead-consent/1`, `telegram-link/1`);
  - explicit default-deny policies for the new function-only tables;
  - v87 `is_delivery_previous_host_owned`, the same never-created function class
    as v78, which breaks activation when a previous hostname is set.- Coverage v88-v93: audit view gains `retention_runs` proofs; settings payload
  gains the platform outbox; configuration gains activation attempts; billing
  gains `invoice_list` plus a Faktur section; article tags (`articles.tags`, GIN,
  and `/tags/[tag]`); per-site page views (`view_count` for real via Redis INCR
  and `after()`, custom base via dashboard, daily flush worker); the article page
  gains an author box, share box, updated stamp, publisher box, and related plus
  prev/next; v93 merges the view counters into one absolute number.

### Fixed

- The Ignored Build Step compared only `HEAD^..HEAD`, so it saw just the last
  commit of a push. A push whose final commit was docs-only exited 0, Vercel
  cancelled the build, and every code commit in that same push never reached
  production. It now diffs from `VERCEL_GIT_PREVIOUS_SHA`, the last successful
  deployment, and an unresolvable base fails the diff so an unknown range errs
  toward deploying.
- Social warming truncated its queue at the first eight URLs. A task is recorded
  complete before warming runs, so `claim_delivery_invalidation_tasks` never
  reclaimed it and anything past the eighth stayed cold until its edge TTL
  expired. The queue now drains in batches of the same width, bounded by a 64-URL
  ceiling and a 15s budget, and reports the skipped remainder and any incomplete
  warm instead of dropping them silently.
- Empty states rendered pinned to the top of an otherwise blank viewport because
  the template shells made `main` a plain block. Contact channels also now sit
  three across on desktop instead of stacking one per row.
- Global error actions were left-aligned in a full-width row, so the recovery path
  read as an orphaned fragment on wide viewports.
- Removed `99.99% tergaransi` / `100% Exact` warranty language (now operational
  targets referencing Terms §17); softened absolute isolation, audit, and media
  claims.
- Replaced the neutral-text sign-in button with the official-style Google button
  (inline multicolor "G", white pill, Google Identity styling).
- Edge-deny logs now mask client IPs (/24-/48); media redirects use
  `private, no-store`; Telegram 429 surfaces `retry_after`; image `remotePatterns`
  narrowed to single-level wildcards.
- Footer copyright attributes the rights holder; README carries trademark and
  non-SLA disclaimers.
- Follow-up v77: covering indexes for the new FKs (advisor
  `unindexed_foreign_keys` cleared); v74 digest literal re-synced after the fix.
- Follow-up v78: created the missing
  `indicate_private.claim_delivery_activation_attempts`, called by the delivery
  reconciler but never created by any prior migration; the claim pattern mirrors
  `claim_delivery_invalidation_tasks`.
- `CONTRIBUTING.md` — corrected the repository layout to `src/app/`,
  `src/modules/`, `src/core/`, `src/data/`, `src/integrations/`, `src/ui/`; fixed
  the migration path to `src/data/migrations/` in filename order with credential
  separation; fixed the design-system link to the in-code visual authority
  (`src/app/globals.css`, `src/components/ui/`); aligned commit scopes and import
  boundaries with `docs/architecture.md`.

### Changed

- Documented route groups as `(site)`, `(network)`, `(auth)`, `(dashboard)` with
  group-specific `_composition/` roots and per-segment `loading.tsx` /
  `error.tsx` conventions.
- Route group layouts gained appropriate error boundaries and loading states.

## [0.1.0] - 2026-09-02

### Added

- Complete seven-stage Indicate MVP
- Multi-tenant CMS with exact-host routing and tenant isolation
- Publication workflows with PostgreSQL-backed durability, bounded retries, leases, and fencing
- Tenant-isolated media storage via private Cloudflare R2 with ownership-scoped authorization
- Telegram bot integration with identity-mapped editorial workflows
- REST API with scoped API key authentication
- Automated release quality gates and production readiness inspection
- Forward-only database migration sequence (0000-0024) with RLS, audit, and runtime config
- Comprehensive test layers: unit, property, integration, e2e, PostgreSQL contracts, provider contracts
- Hostname-aware public news template with per-site SEO, RSS, sitemap, and JSON-LD
- Design system contract (`DESIGN.md`) — dark indigo control-room aesthetic with brass accent
- Policy enforcement scripts for import boundaries, client secrets, migrations, and deployment
- CI pipeline with deterministic quality gate and live PostgreSQL contract jobs
