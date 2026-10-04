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

- Buatkan-berita-untuk-org: admin menulis dari dasbor operator, memilih
  penerbit humas, dan artikel, media, atribusi, serta audit melekat ke org
  UPT pemilik (v255-v257: wilayah, penulis Redaksi, dan kategori tiap org
  UPT; v256/v260: pencari org lintas-org). Form mengisi wilayah/kota/sumber
  otomatis dari penerbit dan mengunggah foto ke org tujuan. Jejak audit
  tetap mencatat admin sebagai pelaku.
- Jembatan penayangan lintas-org (v258-v259): artikel milik UPT tayang di
  portal operator lewat `portal_assignments` + pembaca `SECURITY DEFINER`,
  tanpa melonggarkan FK/RLS satu-org yang ada. Penerbitan sinkron (tanpa
  antrean pekerja), SEO membawa identitas institusi pemilik, dan
  `Redaksi {tenant}` dinamis untuk label generik di kartu artikel.
- Terms and privacy consent on the two forms that take personal data. The
  tenant report form now ships a shadcn `Checkbox` that must be ticked before
  the report is sent, linking to that tenant's own `/syarat-ketentuan` and
  `/kebijakan-privasi`; `/sign-up` does the same against `/terms` and
  `/privacy` and records `terms_accepted_at` in Supabase user metadata at the
  moment of acceptance, so the record travels with the account. Tenancy comes
  from `TemplateCheckbox` in `src/modules/site/components/network/ui/field.tsx`,
  which restates the shadcn checked colors against `--tpl-*` because the
  dashboard `--primary` token a tenant page never sets.

- `Hasil Tayang` dashboard view: every published article with its live portal
  URLs, numbered in a code block and copyable for WhatsApp. Reads the same
  editorial payload the article archive uses, so a row it lists is one a
  reader can open right now. URLs come from `article_sites.published_url` and
  fall back to `https://{hostname}/{slug}`, the shape the public article route
  serves; only `published` rows are listed, since an assignment still queued
  would advertise a link that 404s. The copy payload is the plain numbered list
  with no code fence, so pasting into a chat leaves clean lines, and it always
  carries every URL even though the block scrolls.

- Server-verified Cloudflare Turnstile on the tenant report form
  (`POST /api/network/reports`). The widget in the browser now hands a one-time
  token to the server in the `cf-turnstile-response` header, and the server
  re-verifies it against the Siteverify API before parsing the body, so a
  forged or absent token is refused there. Anything the server cannot read from
  Cloudflare (transport failure, non-2xx, unparseable body, no boolean
  `success`) denies rather than admits: a refused token answers 403, a
  Cloudflare-side fault answers 503 so a verification outage never reads as a
  reader being blocked for bot reasons. The submit button is deliberately not
  gated on a pending challenge, so a blocked challenge script cannot make the
  form unsubmittable.
- The Turnstile widget is now armed on form completeness instead of loading on
  page view. `useTurnstileChallenge` takes the form's own readiness, and
  `TurnstileChallenge` takes the same flag, so the Cloudflare script and widget
  stay unmounted until a reader has actually filled something in — across the
  four auth leaves and all ten tenant report-form templates. A page view, a
  bounce, and a half-typed form now cost no third-party script, no iframe, and
  no solve, and the latency the widget adds lands while the reader is still
  reading their own text instead of on the click. Arming latches, so editing a
  field back under its threshold cannot tear down a solve already in flight.
  A submit that beats the solve waits up to 2 s for the token
  (`waitForChallengeToken`) rather than racing the server into a 403, and the
  report form reserves the widget's slot so arming it does not shove the submit
  button down the page. The server remains the only enforcement point.
- Per-apex Turnstile coverage for the report form (migration v218). Cloudflare
  authorizes at most ten hostnames per widget, so the 134 tenant apexes need
  fourteen widgets; `domains.report_challenge_sitekey` records which widget
  serves which apex and `TURNSTILE_REPORT_SECRETS` holds each widget's
  Siteverify secret keyed by site key. The route resolves the tenant from the
  request host and verifies with that apex's secret only, so the
  `cf-turnstile-sitekey` header selects a secret rather than granting one. A
  domain with no widget, or a widget with no provisioned secret, runs
  unchallenged under the existing rate limits instead of refusing readers.
  Adding a tenant stays DB-only: create a widget, add the apex, set the column,
  add the secret.
- The Turnstile widget moved from `src/modules/auth/components/turnstile-field.tsx`
  to `src/components/turnstile-challenge.tsx` with an injectable failure notice,
  so the auth forms and the tenant report form share one loader instead of two
  copies of the same script handling.
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

- `POST /api/network/reports` reports an intake outage as HTTP 503 instead of
  collapsing it into 404, which told a complainant their report was addressed
  when nothing was stored and hid a broken channel from whoever would otherwise
  notice. All remaining outcome codes stay 404 so tenant content is never
  disclosed.
- The daily `/api/health` keep-alive cron that
  `docs/production-readiness-runbook.md` requires was missing from
  `vercel.json`. The route reads the configuration snapshot from Postgres on
  every request, so it is the call that holds off a Supabase Free auto-pause.
  Scheduled at 04:47 UTC, clear of the 05:00 certificate and 05:30 export runs.
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

- An article slug now spans up to 300 characters instead of 100, so a slug can
  carry a whole article title instead of being cut mid-word (v219).
  `SLUG_MAX_LENGTH` is pinned to `ARTICLE_TITLE_MAX` and a test holds the two
  equal, so the title and the slug can no longer drift apart. The editor's slug
  field carries the same bound as `maxLength`, uniqueness suffixes (`-2`, `-3`)
  are trimmed into the same budget, and over-long input is truncated rather than
  refused, which is how the schema already behaved. Category and region slugs keep
  the 100-character bound because they name fixed taxonomy, not an article.
  Migration v219 adds `articles_slug_shape`, the first database-level guard on
  the column: until now the bound lived only in Zod, so a write arriving through
  SQL could store a slug that `normalizeArticleSlug` then refused to read and the
  article's public route 404'd. The 300 ceiling is deliberate rather than
  unbounded — `articles_organization_slug_unique` is a btree, and a btree tuple
  stops fitting past roughly 2704 bytes, which would turn a long title into a hard
  insert error instead of a validation error.
- The Facebook/Meta integration is gone (v217). Removed the Graph API pre-scrape
  (hourly fleet sweep plus the one-shot per-article ledger), the `fb:app_id`
  metadata tag, the `FB_APP_TOKEN` credential, and the `social` runtime config
  slice, with the matching cron entry, modules, repositories, tests, and
  `.env.example` block. The Open Graph surface is untouched and stays
  platform-independent: `generateMetadata()`, `og:image`, Twitter cards, the
  robots carve-out for `/api/network/media/`, and R2 delivery on the tenant host
  are what a crawler actually reads, and none of them authenticate to a third
  party. Dropping `FB_APP_TOKEN` from the environment is now safe — the schema
  no longer recognizes it.
- Vercel Web Analytics is gone from the root layout. It carried no `track()`
  call, no custom event, and no property, so it fed only the raw traffic tab in
  the Vercel dashboard while the product's own view analytics ran entirely
  first-party: pageview beacon to Redis buffer to the view flush cron to
  `article_site_view_days` to `buildAnalytics`, per article, per site, per day.
  Pro includes no Web Analytics events and bills the rest per thousand, so the
  script cost real money for a number the dashboard already had at higher
  resolution. Speed Insights stays: it bills zero today and is the source of
  Core Web Vitals. `@vercel/analytics` is left in `package.json` for the owner
  to drop alongside the next dependency change; an unrendered component bills
  nothing.
- Publication dispatch no longer waits for the cron tick. A publish, bulk
  publish, or retry drains the queue through `after()` in the request that
  enqueued it, so a job due now starts in seconds instead of up to a minute
  later. The worker module is imported dynamically, so the read path never loads
  it, and a failed drain leaves the job due for the poller.
- Idle publishing ticks cost two `ZCARD` reads. `RedisCoordinationPort` gained
  `hasPendingWork()`, and the cron handler short-circuits before building the
  Postgres pool, the R2 client, and the target publisher. See
  `docs/architecture.md` §12.6.
- The view flush opens its Postgres pool only after Redis reports buffered
  counters, so an empty sweep touches Redis alone.
- Delivery provisioning reconciliation moved from every fifteen minutes to
  hourly and view flushing from hourly to every three hours. Neither is on the
  publish path: provisioning resumes tenant activation, and view counters were
  already coarse. Cache invalidation and the publishing worker stay at one
  minute.
- The Ignored Build Step moved to `scripts/ci/skip-build.sh` and widened to
  `*.test.ts`, `*.test.tsx`, `.agents/`, `LICENSE`, `.prettierrc`,
  `.markdownlint.json`, and `skills-lock.json`. The inline form had 38 characters
  of headroom left against the schema's 256-character cap, and the rule had
  already cost four commits of build failures. `scripts/` stays
  build-triggering on purpose: a broken gate is worse than a wasted build.
- Documented route groups as `(site)`, `(network)`, `(auth)`, `(dashboard)` with
  group-specific `_composition/` roots and per-segment `loading.tsx` /
  `error.tsx` conventions.
- Route group layouts gained appropriate error boundaries and loading states.

### Security

- Public report intake carries a second, per-client-IP rate-limit bucket
  alongside the per-host one. The per-host bucket alone let a single caller
  exhaust a tenant's whole allowance and lock out every legitimate complainant
  for the window. The per-IP key uses `extractPlatformIp` (Cloudflare-supplied
  only) and is skipped rather than replaced by a shared key when no edge IP is
  present, so direct non-edge access degrades to the per-host bound. Both
  buckets are enforced before the body is read and both fail closed.
- `content_reports.article_url` is validated as an absolute `http`/`https` URL at
  intake instead of a length-bounded string, closing a latent stored-XSS and
  open-redirect vector: the value is stored and shipped to the dashboard
  moderation queue, where a bare string bound admitted `javascript:` and `data:`
  payloads. The shared schema lives in `reportIntakeSchema` and
  `reportSubmitSchema` so the route and the service cannot drift.
- `/report?artikel=` and the intake body now share one canonical article-slug
  normalizer, which caps at `SLUG_MAX_LENGTH` (100, the same bound the dashboard
  and database enforce) and rejects anything that could never be a stored slug.
  Previously the report path accepted any printable string up to 200 characters.
- The report-intake catch-all no longer swallows the underlying error: intake
  failures emit a `network.report.intake_failed` error event, so a database or
  Redis regression is visible in telemetry instead of only as a status-code
  count.

### Removed

- Ten per-template `README.md` files under
  `src/modules/site/components/network/templates/`. All ten were 23 lines and
  differed only in the title line; the folder map, the `@/`-only import rule,
  the `--tpl-*` form-control contract, the `network-listing.tsx` switch
  registration, and the pure-`lib/` requirement are all stated once in
  `docs/templates.md`, which is now the single place to look.
- `docs/plans/audit-remediation-2026-09-24.md`. Every phase was executed and
  checked off; the outcomes it recorded are already in this changelog, and a
  finished plan document is history that a reader can mistake for a backlog.
- `docs/schema-audit.md`. `docs/README.md` labelled it "Generated", but the
  document stated that no generator exists and that its numbers came from
  manual inspection — so it went stale on the first schema change while still
  reading as authoritative. `docs/migrations.md` now points at the rule that
  actually governs column coverage in `AGENTS.md`.
- Three different Vercel domain counts were live at once — 50 in the release
  checklist, 213 in the activation ledger, 222 in the multi-tenant archive —
  for one project that actually holds **273 associations, all verified**
  (134 tenant apexes exact, 135 tenant wildcards, 3 control-plane hosts, 1
  `vercel.app`, counted live on 2026-09-29). A checklist asserting 50/50 while
  the project holds 273 is a gate that misleads the operator reading it, so the
  checklist now enumerates the count from the Vercel API rather than quoting a
  stored number, and `docs/active-domains.md` holds the one dated breakdown.
- `docs/production-readiness-runbook.md` and `docs/release-checklist.md` merged
  into `docs/release.md`. Both described one event — readiness, release order,
  and rollback — and the rollback procedure was written out twice, with the
  checklist explicitly labelling itself a complement to the runbook. The merged
  file keeps every check, the WORM owner-gated item, the smoke-test command,
  the staged-monitoring table, per-tenant triage, and both rollback paths under
  three headings: readiness, release order, rollback. Ten cross-references were
  repointed.
- `docs/architecture-policy.md` folded back into `docs/architecture.md` §21. It
  had been split out three days earlier, so a reader of the architecture
  document had to open a second file to learn which parts of it actually bound
  their build. The content is unchanged in substance: quality architecture, the
  completed seven-stage sequence, the eleven decision boundaries, and the
  2026-08-30 pre-launch confirmations. The header now states plainly that §21
  binds nothing while §1-20 do.
- `docs/domains.md` and `docs/active-domains.md` merged into one
  `docs/domains.md`. The two described the same 134 apexes from opposite ends —
  one as a registrar inventory, the other as a dated activation log — and the
  2026-09-25 and 2026-09-26 Exabytes batches were written out in both, twice
  each, with the same two root causes restated. The merged file keeps the
  inventory tables, the live counts, and the rules, and reduces the log to one
  row per onboarding batch.
- Three data-model changes that had accumulated inside the domain inventory
  moved here, because no reader looking for a domain list is looking for them:
  `articles.category_id` gained a `Berita` default after `Umum` was renamed in
  place (v216), so an uncategorised article can no longer land in a bucket
  nobody opens; the nine `independent_publisher` brand rows were archived,
  leaving `publishers` at 118 institutions; and `official_affiliations` stores
  one row per portal, so 59 institution facts are 7,906 rows and the dashboard
  groups them back by `(publisher, city, institution)`.

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
