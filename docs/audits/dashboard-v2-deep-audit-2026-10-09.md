# INDICATE Dashboard V2 Deep Audit

**Repository:** `idugeni/indicate`  
**Base:** `main` at `d8fb3caaa9086ac010c136dd67d26ec053e7e6b0`  
**Audit branch:** `audit/dashboard-v2-deep-audit`  
**Date:** 2026-10-09  
**Scope:** All 19 registered dashboard views, their primary render surfaces, corresponding API paths, test-file presence, and targeted source-level defects found during inspection.

## Audit standard

V2 is treated as replacement of the primary user workflow, not a visual restyle. A source file or test name containing `v2` is not sufficient proof of functional completeness. This audit distinguishes:

- **Observed in source:** render wiring, request contracts, state handling, and test presence.
- **Automated verification:** must be established by checks running against this branch's exact head SHA.
- **Runtime verification:** authenticated tenant/role scenarios and browser behavior; not claimed by this source-only audit.

## 19-view evidence matrix

| # | View | Primary render surface | Main data/command boundary observed | V2 component test | Current assessment |
|---:|---|---|---|---|---|
| 1 | Command Center | `dashboard-v2-command-center.tsx` | Workspace dashboard snapshot; analytics projection | `dashboard-v2-command-center.test.tsx` | Dedicated V2 surface; runtime behavior not independently verified |
| 2 | Network Intelligence | `analytics/network-intelligence-v2.tsx` | Workspace analytics projection | `analytics/network-intelligence-v2.test.tsx` | Dedicated V2 surface; runtime behavior not independently verified |
| 3 | Editorial Workspace | `editorial/editorial-workspace-v2.tsx` | Workspace view + article commands | `editorial/editorial-workspace-v2.test.tsx` | Dedicated V2 shell; editor subcomponents still need workflow-level review |
| 4 | Content Library | `editorial/content-library-v2.tsx` | Workspace article listing + archive/restore/delete commands | `editorial/content-library-v2.test.tsx` | **Defects found and fixed:** pager beyond loaded rows and bulk archive refreshing once per item |
| 5 | Taxonomy Studio | `editorial/taxonomy-control-center-v2.tsx` | Workspace taxonomy projection + taxonomy commands | `editorial/taxonomy-control-center-v2.test.tsx` | Dedicated V2 surface; command contract not live-tested here |
| 6 | Publisher Network | `editorial/publisher-network-v2.tsx` | Workspace publisher projection + publisher commands | `editorial/publisher-network-v2.test.tsx` | Dedicated V2 surface; command contract not live-tested here |
| 7 | Media Library | `publishing/media-library-v2.tsx` | Publishing command API: `media.list`, `media.read`; upload subflow | `publishing/media-library-v2.test.tsx` **added on this branch** | **Defects found and fixed:** filtered server results were discarded, the default-query signature was incorrect, and stale filter responses could overwrite the latest query |
| 8 | Distribution Control | `publishing/distribution-control-v2.tsx` | Publishing command API: publication request/status and site assignment | `publishing/distribution-control-v2.test.tsx` | Dedicated V2 surface; production delivery not exercised by this audit |
| 9 | Live Results | `publishing/live-results-v2.tsx` | Workspace published-results projection + share-readiness endpoint | `publishing/live-results-v2.test.tsx` | On-demand readiness check is covered; external destination readiness not live-tested |
| 10 | Ads Control Center | `ads/ads-control-center-v2.tsx` | `/api/dashboard/ads` | `ads/ads-control-center-v2.test.tsx` | Dedicated V2 surface; endpoint performs organization authorization in source |
| 11 | Network Infrastructure | `infrastructure/infrastructure-control-center-v2.tsx` | Workspace configuration view + existing configuration commands | `infrastructure/infrastructure-control-center-v2.test.tsx` | Dedicated V2 shell reuses focused domain forms; those subflows need end-to-end verification |
| 12 | Access & Integrations | `settings/access-integrations-v2.tsx` | Workspace integration projection + integrations commands | `settings/access-integrations-v2.test.tsx` | Permission-aware UI observed; endpoint/runtime permission matrix not exercised here |
| 13 | Billing & Plan | `billing/monetization-control-center-v2.tsx` | `/api/dashboard/billing` and integrations customer listing | `billing/monetization-control-center-v2.test.tsx` | **Defects found and fixed:** initial loading/empty ambiguity and missing cursor continuation in the invoice ledger |
| 14 | Audit & Security | `audit/audit-security-v2.tsx` | Workspace audit projection and cursor-based audit continuation | `audit/audit-security-v2.test.tsx` | Dedicated V2 investigation surface; audit retention/runtime permissions not exercised here |
| 15 | System Operations | `operations/system-operations-v2.tsx` | Workspace operations projection | `operations/system-operations-v2.test.tsx` | Dedicated V2 control surface; destructive/maintenance operations not exercised here |
| 16 | Trust & Moderation | `trust/trust-moderation-v2.tsx` | `/api/dashboard/moderation` | `trust/trust-moderation-v2.test.tsx` | Platform-authorized API boundary observed; privileged workflow not live-tested |
| 17 | Customer Operations | `customers/customer-operations-v2.tsx` | Integrations customer list/detail API + customer command subflow | `customers/customer-operations-v2.test.tsx` | Dedicated Customer 360 surface; account mutation and tenant boundaries need authenticated integration tests |
| 18 | Public Web Content | `content/public-web-content-v2.tsx` | `/api/dashboard/content` | `content/public-web-content-v2.test.tsx` | Dedicated posture/quality surface; editor subflow intentionally reuses domain editor |
| 19 | AI Control Center | `settings/ai-control-center-v2.tsx` | Integrations AI projection + AI management commands | `settings/ai-control-center-v2.test.tsx` | Dedicated V2 surface; external provider execution and budget enforcement not live-tested |

## Targeted fixes on this branch

### M1 — Media Library V2 server filters discarded their results

**Evidence:** In `media-library-v2.tsx`, the non-default filter effect called `command('media.list', ...)` and received `nextPage.items`, but wrote `items: []` to state. The rendered collection was then built from the original unfiltered base page, so the server-filtered results could not become the visible result set. The effect cleanup only cleared the debounce timer; it did not prevent an already-running stale request from committing after a newer filter.

**Change:** Store the returned `nextPage.items`; render only the server result set for non-default filters; preserve base-page plus cursor-appended items for the default query; cancel state commits from superseded requests.

**Regression tests added:** server-filtered results replace the base page, cursor continuation appends to the filtered result, and an older in-flight query cannot replace a newer query.

### M2 — Media Library V2 default-query signature did not match the filter state

**Evidence:** The component built the query signature as `search|owner|state` (for example, `|all|all`) but checked for `||` to detect the default query. That condition was never true, so the base media page and its initial cursor were not used for the default filter state.

**Change:** Derive the default-query state from the actual filter values (empty search, all owners, all states) and use that state consistently when choosing the base page and cursor.

**Regression tests added:** default media is visible, a non-default server filter replaces the base page, cursor continuation appends results, and a stale response cannot replace the latest query.

### C1 — Content Library V2 allowed navigation to pages whose rows had not been fetched

**Evidence:** The workspace returns article rows in bounded cursor pages and exposes a separate “Muat artikel lebih lama” action. The V2 component calculated the pager's page count from the server-wide `total`, while rendering only the rows already loaded into the current payload. A user could navigate to a page number beyond the loaded row array and see an empty table even though the server reported more matching articles.

**Change:** Calculate the pager's currently navigable page count from the loaded row array. The cursor continuation remains the way to fetch more rows; as rows are appended, the pager naturally exposes the additional loaded pages.

**Regression test added:** with 50 loaded rows and 100 total matches, the pager exposes three loaded pages rather than five pages, preventing navigation into rows that have not been fetched.

### B1 — Billing V2 showed a false empty state during initial loading

**Evidence:** The initial billing effect fetched subscription state and invoices directly, while `busy` started as `false`. The invoice ledger rendered “Belum ada faktur” whenever the current invoice array was empty, including before the initial request completed.

**Change:** Initialize the loading state as active, route the initial request through the shared `load()` lifecycle, and render an explicit invoice-loading status until the request settles. Empty-state copy now distinguishes a genuinely empty ledger from a query/filter with no matches, and a failed initial fetch is not represented as an empty ledger.

**Regression tests added:** a deferred initial request must show loading and must not declare the ledger empty until the request completes; a failed invoice request must surface the error state instead of an empty-ledger message.

### C2 — Content Library bulk archive refreshed the workspace once per selected row

**Evidence:** The shared `DashboardCommandOptions` contract documents `refresh: false` as the default and requires multi-command user actions to request refresh only on the final command. The bulk archive handler called the row action for every selected article in parallel, and each row action passed `{ refresh: true }`. That could cause repeated workspace refetches for one user action.

**Change:** Execute the bounded selected-row archive actions sequentially, disable the bulk action while any selected row is already busy, and request refresh only on the final selected action.

**Regression test added:** a two-row bulk archive asserts that the first command uses `refresh: false` and the final command uses `refresh: true`.

### B2 — Billing V2 did not expose the API's cursor-paginated invoice ledger

**Evidence:** `GET /api/dashboard/billing?scope=invoices` accepts `limit` and `cursor`, and the repository calls `invoice_list_for_org` with a bounded limit and last-row cursor. The V2 component fetched only the first page and had no continuation control.

**Change:** Request an explicit page size of 100, derive the next cursor from the final row's `createdAt~id`, append subsequent pages without duplicate invoice IDs, and expose a disabled/loading-aware “Muat faktur berikutnya” action while another page exists.

**Regression test added:** a full first page exposes continuation; the next cursor request appends the next invoice and hides continuation when the response is shorter than the page size.

### A1 — Direct URL navigation bypassed view-registry permission visibility

**Evidence:** The sidebar and command palette used visibleNavGroups(permissions), but DashboardWorkspace initialized the selected view from the URL and DashboardViewPanel rendered that view without checking VIEW_REGISTRY[view].requiredPermission. A restricted view could therefore mount its client component when a user manually supplied a gated view query. Server APIs still authorize requests, but the UI did not consistently enforce the same view-level contract.

**Change:** Added one canAccessView predicate and reused it for nav visibility, the workspace data-loading effect, and the view panel. Restricted direct navigation no longer triggers workspace fetching or mounts the restricted component; the user gets a clear denial state and a route back to Command Center.

**Regression tests added:** permission predicates for gated and ungated views, plus a workspace test proving a direct customers view does not mount the customer data-owning panel or issue its request.

### W1 — Workspace-backed V2 panels could render false empty states while their first payload was pending

**Evidence:** After switching views, the current payload is intentionally keyed to the selected view and is null until its request resolves. Several V2 panels interpret absent rows as an empty collection, so the UI could briefly report zero records even though the request had not settled. The Command Center also kept a skeleton indefinitely on a failed initial load without an in-panel retry.

**Change:** The panel now uses the view-specific loading skeleton for every workspace-backed V2 surface while the payload is absent. Failed loads render a retry action; the Command Center gets the same explicit error/retry treatment. Self-fetching panels retain their own loading/error lifecycle.

**Regression test added:** a deferred Publisher Network request keeps the loading skeleton visible and does not expose an empty-state message before the payload arrives.

### C3 — Customer Operations silently stopped at the first customer page

**Evidence:** The integrations customer endpoint already accepted bounded limit and cursor parameters, but CustomerOperationsV2 sent neither. The route default page size is 100, the UI rendered only that response array, and no continuation metadata was returned to the client.

**Change:** The route now preserves its existing array response for compatibility and exposes X-Next-Cursor when a full bounded page was returned. Customer Operations requests 100-row pages, appends cursor pages with ID deduplication, prevents concurrent continuation requests, ignores stale results after organization changes, and exposes retry feedback.

**Regression test added:** the directory follows the cursor, appends a second page, and removes the continuation action when the next page is short.

### W2 — Public Web Content presented zeros as a loaded snapshot and had no retry action

**Evidence:** PublicWebContentV2 initialized busy to false, so its first render showed zero counts and could claim every block was active before the GET request settled. A failed request only displayed a message; no action could retry it. The initial effect also had no abort lifecycle.

**Change:** Initial loading is now explicit; unknown counts render as an em dash; posture/component views expose loading status; request failures provide a retry button; and an abort controller prevents state commits after unmount.

**Regression tests added:** a deferred request does not display a false empty snapshot, and a failed request can be retried successfully.

### T1 — Trust & Moderation reported an empty queue before its initial requests settled

**Evidence:** The component initialized busy to false while its effect fetched four moderation collections. The queue could therefore render the real empty-state copy and zero metrics before the first request completed; failures also had no in-panel retry action.

**Change:** Initial loading is active, metrics remain unknown until the first successful snapshot, the queue has an explicit loading/unknown state, and the error alert exposes a retry action.

**Regression tests added:** a deferred four-collection request stays in loading state, and a failed initial load can be retried.

## Cross-cutting checks observed in source

- `view-registry.ts` registers 19 views and applies permission-based navigation visibility.
- `dashboard-view-panel.tsx` routes each registered view to a dedicated component; the legacy generic renderer was removed in recent main commits.
- The inspected tenant-scoped routes for workspace, ads, integrations, and publishing commands resolve an authenticated actor and authorize the requested organization. Billing and moderation use platform authorization patterns. This is source inspection only, not a claim that every role/tenant combination passes at runtime.
- The component inventory includes loading/error/empty handling in multiple V2 surfaces, but completeness and accessibility of every state must be established per component/test, not inferred globally.
- The V2 component test exists for each of the 19 primary views after this branch adds the missing Media Library V2 test. Test presence is not equivalent to complete CRUD, security, mobile, or integration coverage.
- No production data was seeded or changed as part of this source audit.

## Verification status

Final local verification on the current feature branch:

- npm run typecheck — pass
- npm run lint — pass
- npm run lint:docs — pass after the audit updates
- npm run perf — pass
- npm test — 546 test files, 3,568 tests passed
- Post-suite focused regression run after the final loading/deduplication adjustments — 9/9 tests passed
- npm run build — the optimized production bundle compiled successfully, then static generation stopped on the /indeks route during strict runtime configuration validation. This isolated workspace lacks required production runtime credentials and injects UPSTASH_BOX_* variables that are not application configuration. This is not counted as a full local build pass.
- Release Quality Gate #777 initially failed during static generation with Postgres EMAXCONN (200 client connections) while test shards were running concurrently. The isolated build retry passed after the test shards completed, confirming shared-database contention rather than a deterministic code/build failure. The workflow now serializes production-backed static generation after the test matrix instead of reducing the runtime pool size. Release Quality Gate #778 passed with this ordering on code/workflow SHA a7eef02d3dcc9a76ba52578dc4d7f99998642a70; Docs Gate #56 also passed.

## Remaining release verification

The code-level regressions listed above now have targeted tests. These checks remain release verification rather than reasons to substitute a V1 workflow:

1. Push this branch and require the full GitHub Quality Gate to pass on the exact new head SHA.
2. Exercise the primary flow in all 19 views in an authenticated browser at desktop and mobile widths, including keyboard navigation and recovery from failed requests.
3. Run the tenant/role denial matrix against the authenticated runtime: ordinary tenant user, organization admin, customer administrator, and platform administrator; include cross-tenant read/write denial.
4. Verify live external provider and delivery outcomes only in an approved non-production environment with appropriate credentials. No production data writes or external delivery calls are part of this code audit.

Do not call production healthy or merge this draft PR until the applicable release checks are green and the remaining runtime evidence is recorded.
