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
| 4 | Content Library | `editorial/content-library-v2.tsx` | Workspace article listing + archive/restore/delete commands | `editorial/content-library-v2.test.tsx` | **Defect found and fixed:** pager previously exposed pages beyond the currently loaded cursor rows, producing empty future pages |
| 5 | Taxonomy Studio | `editorial/taxonomy-control-center-v2.tsx` | Workspace taxonomy projection + taxonomy commands | `editorial/taxonomy-control-center-v2.test.tsx` | Dedicated V2 surface; command contract not live-tested here |
| 6 | Publisher Network | `editorial/publisher-network-v2.tsx` | Workspace publisher projection + publisher commands | `editorial/publisher-network-v2.test.tsx` | Dedicated V2 surface; command contract not live-tested here |
| 7 | Media Library | `publishing/media-library-v2.tsx` | Publishing command API: `media.list`, `media.read`; upload subflow | `publishing/media-library-v2.test.tsx` **added on this branch** | **Defect found and fixed:** filtered server results were discarded; stale filter responses could overwrite the latest query |
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

### C1 — Content Library V2 allowed navigation to pages whose rows had not been fetched

**Evidence:** The workspace returns article rows in bounded cursor pages and exposes a separate “Muat artikel lebih lama” action. The V2 component calculated the pager's page count from the server-wide `total`, while rendering only the rows already loaded into the current payload. A user could navigate to a page number beyond the loaded row array and see an empty table even though the server reported more matching articles.

**Change:** Calculate the pager's currently navigable page count from the loaded row array. The cursor continuation remains the way to fetch more rows; as rows are appended, the pager naturally exposes the additional loaded pages.

**Regression test added:** with 50 loaded rows and 100 total matches, the pager exposes three loaded pages rather than five pages, preventing navigation into rows that have not been fetched.

### B1 — Billing V2 showed a false empty state during initial loading

**Evidence:** The initial billing effect fetched subscription state and invoices directly, while `busy` started as `false`. The invoice ledger rendered “Belum ada faktur” whenever the current invoice array was empty, including before the initial request completed.

**Change:** Initialize the loading state as active, route the initial request through the shared `load()` lifecycle, and render an explicit invoice-loading status until the request settles. Empty-state copy now distinguishes a genuinely empty ledger from a query/filter with no matches, and a failed initial fetch is not represented as an empty ledger.

**Regression tests added:** a deferred initial request must show loading and must not declare the ledger empty until the request completes; a failed invoice request must surface the error state instead of an empty-ledger message.

### B2 — Billing V2 did not expose the API's cursor-paginated invoice ledger

**Evidence:** `GET /api/dashboard/billing?scope=invoices` accepts `limit` and `cursor`, and the repository calls `invoice_list_for_org` with a bounded limit and last-row cursor. The V2 component fetched only the first page and had no continuation control.

**Change:** Request an explicit page size of 100, derive the next cursor from the final row's `createdAt~id`, append subsequent pages without duplicate invoice IDs, and expose a disabled/loading-aware “Muat faktur berikutnya” action while another page exists.

**Regression test added:** a full first page exposes continuation; the next cursor request appends the next invoice and hides continuation when the response is shorter than the page size.

## Cross-cutting checks observed in source

- `view-registry.ts` registers 19 views and applies permission-based navigation visibility.
- `dashboard-view-panel.tsx` routes each registered view to a dedicated component; the legacy generic renderer was removed in recent main commits.
- The inspected tenant-scoped routes for workspace, ads, integrations, and publishing commands resolve an authenticated actor and authorize the requested organization. Billing and moderation use platform authorization patterns. This is source inspection only, not a claim that every role/tenant combination passes at runtime.
- The component inventory includes loading/error/empty handling in multiple V2 surfaces, but completeness and accessibility of every state must be established per component/test, not inferred globally.
- The V2 component test exists for each of the 19 primary views after this branch adds the missing Media Library V2 test. Test presence is not equivalent to complete CRUD, security, mobile, or integration coverage.
- No production data was seeded or changed as part of this source audit.

## Verification status

At the time this report was authored, the previously observed `main` quality gate was green, but that run predates these branch changes. **It does not validate this branch.** The branch's tests, lint, build, performance check, and quality gate must pass on the exact new head SHA before merge. Authenticated browser checks, cross-tenant denial tests, and live external-service checks remain unverified unless separately run and recorded.

## Remaining audit work before calling V2 complete

1. Run the full repository quality gate against this branch and fix all failures on the same branch.
2. Verify every view's primary actions against the actual API/service command map, including success/error recovery and optimistic concurrency behavior.
3. Run tenant-isolation and permission tests for normal tenant users, organization admins, and platform administrators against the real authorization boundary.
4. Verify mobile layouts, keyboard operation, and loading/empty/error/success transitions in a browser.
5. Inspect remaining legacy subcomponents for primary-workflow leakage; reuse is acceptable only where the V2 workflow remains the primary user-facing flow.
6. Record exact test/check results for this branch. Do not infer production health from a successful build or a prior main-branch deployment.
