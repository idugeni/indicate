# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Single-price manual billing (v136–v137): Rp550.000 incl PPN pinned by schema/service/DB; invoice numbers follow paid month; `invoice.reissue` for voided invoices; subscription/invoice Telegram routes run as the sole platform admin with `telegram` audit entry point; unlimited subscription until admin suspends/cancels via dashboard, API, or Telegram Mini App

- `THIRD-PARTY-NOTICES.md` — upstream attributions (Radix/Base UI/shadcn/Lucide/react-icons, Fraunces/IBM Plex OFL, sharp LGPL, lightningcss MPL) plus trademark disclaimer
- `docs/PENDING-IMPLEMENTATION.md` — sisa pekerjaan yang belum dieksekusi (menggantikan folder `docs/plans/` yang dihapus)
- Clickwrap consent on billing orders (`termsAccepted` + `TERMS_VERSION=2026-09-05`, checkbox UI with 12-month cap summary)
- DCO `Signed-off-by` requirement plus origin/license checklist in the PR template
- Fase B legal-hardening (live v68–v70): `orders.terms_version/terms_accepted_at` persisted via 6-arg `billing_order_create` (5-arg shim fails closed); `refunded` order status with platform-only `billing_order_refund` + `active-orders` listing, refund UI, and 14-day refund SOP in Terms §6–§7; Terms §9/FAQ-5 synced to the real grace → past-due → suspended machine
- History sync (live v71): registered `enterprise_lead_list` (was live without a history row); completed `meta/_journal.json` to 71/71 file-entry parity
- Digest re-baseline (live v72–v73): 10 drifted history checksums re-baselined after live-object verification; 2 malformed literals corrected; file literals updated for triple consistency (recompute == literal == live)
- Fase C (live v74–v75): audit hash-chain (HMAC Vault, DB clock, nightly verify cron) with 9/9 healthy; retention sweep (4 categories, nightly cron) with proof rows; Telegram-ID pseudonymization in audit; Privacy §10/§13 updated
- Fase D (live v76): content reports (public `/report` page + rate-limited intake API, dashboard Moderation view with SLA note) + DSAR tickets (`DSAR-YYYY-XXXXXXXX`, dashboard submit/track/decide) + media license/attribution columns; Terms §14 (1x24h takedown procedure), Privacy §15 (tickets), FAQ-13, `docs/DPA.md` template; Cloudflare 429 surfaced distinctly; rate-limit failure modes documented
- Follow-up v77: covering indexes for the new FKs (advisor `unindexed_foreign_keys` cleared); v74 digest literal re-synced after fix
- Follow-up v78: created missing `indicate_private.claim_delivery_activation_attempts` (called by the delivery reconciler, never created by any prior migration); claim pattern mirrors `claim_delivery_invalidation_tasks`
- Manual subscription regime: `CustomerService.platform()` now honors `platform.super_admin` (completing the documented `customer.admin` transition; nav follows the canonical grant), plus a platform-only "Langganan manual" card in BillingPanel (plan + status + optional end date, NULL period = immune to the daily sweep); `platform.content.manage` granted to the platform admin
- Pending-queue clearance (live v79–v85): litigation holds (`litigation_holds` + `is_org_held` guard inside `retention_sweep`, moderated via dashboard); full org erasure worker (`org_erasure_requests` + `erasure_sweep`, PII anonymization, R2 re-queue, legal archives kept, nightly cron); RLS global-NULL SELECT tightening on the three rollout tables + `audit_worm_fetch` allowlist reader; repaired missing EXECUTE grants (incl. the v78 claim function); Telegram outbox with 429-aware backoff + platform broadcast + daily drain; public enterprise-lead intake (`/api/leads`, pricing form) and Telegram-linking consent trail (`lead-consent/1`, `telegram-link/1`); explicit default-deny policies for the new function-only tables; v87 `is_delivery_previous_host_owned` (same never-created class as v78, breaks activation with a previous hostname)
- Coverage v88–v92: audit view gains `retention_runs` proofs; settings payload gains platform outbox; configuration gains activation attempts; billing gains `invoice_list` + Faktur section; article tags (`articles.tags` + GIN + `/tags/[tag]`); per-site page views (`view_count` real via Redis INCR + `after()`, custom base via dashboard, daily flush worker); article page gains author box, share box, updated stamp, publisher box, related + prev/next; v93 merges view counters into one absolute number

### Fixed

- Removed `99.99% tergaransi` / `100% Exact` warranty language (now operational targets referencing Terms §17); softened absolute isolation/audit/media claims
- Replaced third-party Google logo glyph with neutral text sign-in button
- Edge-deny logs now mask client IPs (/24–/48); media redirects use `private, no-store`; Telegram 429 surfaces `retry_after`; image `remotePatterns` narrowed to single-level wildcards
- Footer copyright attributes the rights holder; README carries trademark and non-SLA disclaimers

### Added

- `LICENSE` — Apache License 2.0 (Copyright 2026 Eliyanto Sarage)
- `SECURITY.md` — vulnerability reporting, secret-handling, and promotion-safety policy
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 community standards
- `SUPPORT.md` — help channels, issue requirements, and supported setup
- `.github/PULL_REQUEST_TEMPLATE.md` — gate evidence plus tenant-isolation, migration, and security checklists
- `.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml` (+ `config.yml` routing security reports privately)
- `.github/CODEOWNERS` and `.github/dependabot.yml` (weekly npm + GitHub Actions updates)
- README links to Contributing, Security, Support, Code of Conduct, Changelog, and License

### Fixed

- `CONTRIBUTING.md` — corrected repository layout to `src/app/`, `src/modules/`, `src/core/`, `src/data/`, `src/integrations/`, `src/ui/`; fixed migration path to `src/data/migrations/` in filename order with credential separation; fixed design-system link to `docs/DESIGN.md`; aligned commit scopes and import boundaries with `docs/ARCHITECTURE.md`

### Changed

- Documented route groups as `(site)`, `(network)`, `(auth)`, `(dashboard)` with group-specific `_composition/` roots and per-segment `loading.tsx` / `error.tsx` conventions

### Added

- `CLAUDE.md` — AI assistant context and project conventions
- `CONTRIBUTING.md` — development workflow and contribution guidelines
- `CHANGELOG.md` — project change history
- Route group layouts with appropriate error boundaries and loading states

## [0.1.0] - 2026-09-02

### Added

- Complete seven-stage Indicate MVP
- Multi-tenant CMS with exact-host routing and tenant isolation
- Publication workflows with PostgreSQL-backed durability, bounded retries, leases, and fencing
- Tenant-isolated media storage via private Cloudflare R2 with ownership-scoped authorization
- Telegram bot integration with identity-mapped editorial workflows
- REST API with scoped API key authentication
- Automated release quality gates and production readiness inspection
- Forward-only database migration sequence (0000–0024) with RLS, audit, and runtime config
- Comprehensive test layers: unit, property, integration, e2e, PostgreSQL contracts, provider contracts
- Hostname-aware public news template with per-site SEO, RSS, sitemap, and JSON-LD
- Design system contract (`DESIGN.md`) — dark indigo control-room aesthetic with brass accent
- Policy enforcement scripts for import boundaries, client secrets, migrations, and deployment
- CI pipeline with deterministic quality gate and live PostgreSQL contract jobs
