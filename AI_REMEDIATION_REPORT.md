# AI REMEDIATION REPORT — F-01 / F-02

> Scope: ONLY `F-01` (P0 embeddings unobserved) and `F-02` (P1 streaming weakened controls)
> from `AI_CALL_FLOW_AUDIT.md`. No deployment. No production calls. No secrets read.
> Audit evidence re-confirmed from code before each change (file/function/caller below).

---

# Executive Summary

Both critical findings are fixed and regression-tested.

- **F-01 FIXED.** All embedding paths (`semantic-search`, `embeddings-reindex`,
  workspace auto-reindex) now pass through a shared control boundary providing
  global-budget, per-org-quota, per-model rate-limit, breaker, audit logging,
  and metrics with provider/model/tenant attribution. Guards add Redis/DB calls
  only — zero new provider calls. No schema migration (channel `embed` and
  status `blocked` already allowed).
- **F-02 FIXED.** The stream path now enforces org quota via the same shared
  pre-flight as `executeAiQuery` (same order, same fail-open and
  pre-charge-on-allow semantics), writes `blocked` audit rows for every guard
  rejection, writes a `success` row for semantic-cache hits, and holds the same
  per-instance concurrency slot as single-shot queries. Partial-stream
  semantics are unchanged (no fallback after partial output).
- Full unit suite: 3460/3461 pass; the single failure is a pre-existing flaky
  ads-panel UI test (no imports from changed modules, passes solo). Typecheck
  clean, lint clean (zero warnings), all `npm run perf` budgets PASS.

---

# F-01 Remediation

```text
Finding: F-01 (P0) — embeddings bypass all AI controls (BP-1).
Root Cause: embedArticleChunks / embedQueryVector / reindexArticleEmbeddings
  called Workers AI and Gemini transports directly with only a key lookup;
  no budget, quota, rate-limit, breaker, logging, or usage attribution.
Files Changed:
  - src/modules/ai/ai-operation-guards.ts (NEW, shared boundary)
  - src/modules/ai/ai-embeddings.ts (guard wiring, legacy path preserved)
  - src/app/api/dashboard/ai/route.ts (controls in both embedding branches)
  - src/app/api/dashboard/workspace/route.ts (controls in auto-reindex)
  - src/core/observability/operation-metrics.ts (model + tokens dimensions)
Before Flow:
  route/workspace → embed → provider fetch → document_embeddings.
  Guards: none. Audit rows: none. Metrics: none.
After Flow:
  route/workspace → embedArticleChunks
    → [controls] checkOperationBudgetQuota (budget → org quota, fail-open,
       pre-charge-on-allow identical to executeAiQuery)
    → per-attempt checkEmbeddingTransport (model RPM/TPM → breaker, fail-open)
    → Workers AI and/or Gemini transport (unchanged provider behavior)
    → recordEmbeddingTransportOutcome (breaker success/failure)
    → exactly one ai_request_logs row (channel 'embed', success/failed/blocked,
       estimated tokens, tenant, no vectors/content) + per-attempt metrics
       (operation, provider, model, tenant, status, tokens).
    → [no controls] legacy unguarded path, byte-identical (offline/tests).
Security Impact: org quotas now enforceable on embeddings; tenant attribution
  on every embedding outcome; no new secret/key handling (keys still resolve
  via resolveApiKey; Workers AI keeps env-token auth; nothing logged).
Load Impact: +2 budget reads, +≤6 quota ops, +1 rate-limit op and +1 breaker
  read per transport attempt (all fail-open). Zero new provider calls; worst
  case unchanged (auto ≤42 embedding HTTP calls per 20-chunk reindex).
Observability Impact: embedding outcomes now queryable per org/provider/model
  in ai_request_logs; ai.embed.* samples in metrics rollup with models and
  token estimates.
Tests: ai-operation-guards.test.ts (20 cases), ai-embeddings-guards.test.ts
  (6 cases) — auth/control path, rate limit, quota, attribution,
  observability, failure paths, fail-open.
```

---

# F-02 Remediation

```text
Finding: F-02 (P1) — streaming weakened controls (BP-4).
Root Cause: handleDraftArticleStream re-implemented the chain without org
  quota, without blocked/cache-hit audit rows, and without the concurrency
  slot. (Injection scan/wrap intentionally not added: the non-stream
  draft-article path runs as staff role 'editor', which skips both in
  executeAiQuery; the route carries no AiCallerRole and the prompt is
  server-composed + secret-scanned — applying the 1500-char scan here would
  reject legitimate long inputs the non-stream path accepts. Documented in
  code at the pre-flight site.)
Files Changed:
  - src/app/api/dashboard/ai/route.ts (shared pre-flight, blocked/cache-hit
    rows, concurrency slot, 'blocked' audit status)
  - src/modules/ai/ai-service.ts (export acquire/release slot, additive only)
  - src/app/api/dashboard/ai/route.test.ts (3 end-to-end pre-flight tests)
Before Flow:
  stream → budget → policy → cache → first-model rate limit → attempts →
  success/fail audit only. No quota, no blocked rows, no cache-hit row,
  unbounded stream concurrency.
After Flow:
  stream → secret scan → checkOperationBudgetQuota (SHARED with executeAiQuery
  and embeddings: budget → org quota, same order/semantics) → policy →
  chain/breaker → cache (hit now audited) → rate limit (denial now audited)
  → slot-bounded SSE attempts → success/fail audit (unchanged sentAny
  partial-output semantics: no fallback after partial output).
Security Impact: org quota enforced on the flagship draft UX; every guard
  decision now leaves an audit row; stream concurrency bounded per instance.
Load Impact: +2 budget reads, +≤6 quota ops per stream (fail-open); slot may
  queue excess concurrent streams per instance instead of overloading
  providers. Zero new provider calls.
Observability Impact: blocked + cache-hit streams visible in
  ai_request_logs with guardrail provider ids and error classes.
Tests: route.test.ts gains quota-blocked (503 + blocked row + zero provider
  fetch), budget-blocked, and cache-hit (SSE + success row + zero provider
  fetch) cases through the real handler with mocked boundaries.
```

---

# Control Parity

| Control | Non-stream | Stream before | Stream after | Embeddings before | Embeddings after |
|---|---|---|---|---|---|
| auth/session+org | yes | yes | yes (unchanged) | yes | yes (unchanged) |
| validation/truncation | yes | yes | yes (unchanged) | truncation only | truncation only (unchanged) |
| secret scan | yes | yes | yes (unchanged) | no | no (embed inputs are article/query text; logged as estimates only) |
| injection scan/wrap | staff-gated | missing | staff-equivalent (documented, see F-02) | missing | not applicable (no generative output to hijack; documented) |
| global budget | yes | yes | shared helper (same) | none | shared helper |
| org quota | yes | MISSING | shared helper (same order/semantics) | none | shared helper |
| routing policy | yes | yes | yes + blocked row | n/a | n/a |
| semantic cache | yes + audit | silent hit | audited hit | n/a | n/a |
| model rate limit | target model | first model | first model (unchanged scope) | none | per attempted model |
| breaker | chain filter + record | chain filter + record | unchanged | none | check + record per attempt |
| credentials | rotation strategies | first only | first only (documented residual) | key lookup | key lookup (unchanged) |
| timeout | per-attempt + deadline | stream timeout | unchanged | transport default | unchanged |
| retry/fallback | ≤12, cross-model | 1/entry, pre-partial only | unchanged (sentAny preserved) | transport 1 retry | unchanged |
| concurrency slot | yes | MISSING | yes (shared slot fns) | n/a | n/a |
| usage record | tokens on success | tokens on success | unchanged | none | estimated tokens logged + metered |
| audit rows | all outcomes | success/fail only | all outcomes incl. blocked/cache-hit | none | exactly one per call |

---

# Embedding Flow After Fix

```text
semantic-search / embeddings-reindex / workspace after()
  ↓ controls { db, budget, namespaced store } + operation label
  ↓ embedArticleChunks
  ↓ budget → org quota (once, estimated tokens = Σ chars/4)
  ↓   blocked → blocked row + 429 metric, ZERO provider calls
  ↓ Workers AI attempt → rate-limit(model) → breaker(model)
  ↓   skipped → 429 metric; auto → next transport, pinned → blocked row
  ↓   served → breaker success + 200 metric → success row → return
  ↓   thrown → breaker failure + 500 metric → auto: next, pinned: failed row
  ↓ Gemini attempt → same gate → key → embed (≤20 serial, 1 retry each)
  ↓   served/all-null → 200 metric + success row
  ↓   no credential/throw → failed row + 500 metric
  ↓ reindex stores chunks (vectors or NULL) — unchanged persistence
```

---

# Streaming Flow After Fix

```text
POST draft-article-stream
  ↓ session + CSRF + Zod + buildDraftArticleInput + secret scan (unchanged)
  ↓ checkOperationBudgetQuota ─┐ shared with executeAiQuery + embeddings
  ↓   blocked → blocked row (NEW) + 503
  ↓ policy (missing → blocked row NEW + 503) → primary chain + cascade
  ↓ breaker filter → cache (hit → success row NEW + SSE done, no provider call)
  ↓ first-model rate limit (denial → blocked row NEW + 503)
  ↓ acquireAiGlobalSlot (NEW, released in finally)
  ↓ per-entry single attempts (unchanged: sentAny suppresses post-partial fallback)
  ↓ success/fail audit (unchanged) → SSE done/error
```

---

# Provider Call Amplification

After-fix maxima per single user request (STATIC bounds from code; guards add
Redis/DB only, never provider calls):

```text
normal draft / single actions      ≤12 provider calls (unchanged)
draft-article-stream              ≤ chain entries, 1 attempt each (unchanged)
transcribe-to-article             ≤36 (3 legs × 12; unchanged, residual D-1/F-05)
semantic-search                   ≤4 embedding HTTP (1+1 retry × up to 2 transports; unchanged)
embeddings-reindex (20 chunks)    ≤42 embedding HTTP (unchanged); BLOCKED requests → 0
credential probe / sweep          unchanged (out of scope, F-03/F-04)
```

No control path multiplies provider calls: budget/quota/rate/breaker checks
run at most once per operation (budget+quota) or once per attempted transport
(rate+breaker), and every block REDUCES calls to zero.

---

# Redis Namespace Verification

New/changed code introduces zero raw `ai:*` key literals (verified by grep):
every counter flows through `checkAiModelRateLimit`, `checkOrganizationQuota`,
`isModelBreakerTripped`, `recordModel*` (all `aiScopedKey`-namespaced), or the
namespaced budget-guard constructors. Writes stay namespaced; legacy-read
fallback behavior untouched. No flush/delete of existing keys.

---

# Observability Verification

- `ai_request_logs`: embedding rows (`channel='embed'`, all three statuses,
  tenant + tokens, no vectors/content — asserted in tests); stream blocked and
  cache-hit rows (asserted end-to-end in route tests). No migration needed
  (free-text channel; status enum already includes `blocked`).
- Metrics contract extended additively: `OperationSample` gains optional
  `model` and `tokens`; rollup emits `models[]`, `modelOverflow`,
  `totalTokens` only when present (existing allowlist test updated +
  extended; leak-regex test still passes — model names contain no banned
  substrings). `recordAiGate` untouched.
- Instrumentation never breaks execution: every guard/log/metric helper is
  fail-open or fail-silent with its own try/catch (tested: throwing budget,
  store, db, and log all resolve to allow/silent).

---

# Bypass Recheck

Re-grep of `GoogleGenAI|generateContent|embedContent|executeStream|
embedTextsViaWorkersAi|getAiAdapter|new OpenAiCompatibleAdapter` shows the
previously known set only, all classified:

```text
BP-1 embeddings  → FIXED (this remediation; guards + audit + metrics)
BP-4 streaming    → FIXED (quota + blocked/cache-hit rows + slot)
BP-2 probe        → RESIDUAL (F-03, admin-scoped, out of scope — unchanged)
BP-3 sweep key    → RESIDUAL (F-04, cron-scoped, out of scope — unchanged)
NEW BYPASS PATHS: 0 (remediation adds no provider calls; test matches are mocks)
```

---

# Duplicate Invocation Regression

```text
D-1 transcribe ×3   → unchanged (legs independent; residual F-05, out of scope)
D-2 stream+retry     → unchanged client logic; blocked streams now audited so
                       double-invocation is at least observable
D-3 save+manual      → both paths now guarded; a blocked duplicate costs zero
                       provider calls; no content-hash skip added (out of scope)
D-4 bundle vs single → unchanged (efficient path already exists)
D-5 partial fallback → preserved and asserted by unchanged sentAny logic;
                       slot acquire/release adds no extra attempts
DUPLICATE INVOCATION STATUS: no new duplication; no D-track remediation attempted.
```

---

# Tests

| Suite | Result |
|---|---|
| typecheck (`tsc --noEmit`) | clean |
| eslint changed files (`--max-warnings=0`) | clean |
| AI-focused (`modules/ai`, `integrations/ai`, observability, dashboard ai/workspace — 51 files) | 508/508 pass |
| Full unit suite | 3460/3461 pass; 1 failure = pre-existing flaky `ads-management-panel.test.tsx` (7s UI timing; zero imports from changed modules; passes solo) |
| `npm run perf` (listing-payload, seal-coldstart, db-access, redis-namespace, ci-duplication) | all PASS |
| New tests | `ai-operation-guards.test.ts` (20), `ai-embeddings-guards.test.ts` (6), `route.test.ts` +3 stream cases, `operation-metrics.test.ts` +1 |
| Existing AI/security suites (rate-limit, security, service, router, adapters, embeddings transport, instrumentation) | all pass unmodified |

Stream coverage honest accounting: quota/budget parity is tested through the
shared helper unit tests AND the real-route blocked tests; rate-limit,
provider-failure, partial-output, fallback, and usage paths are unchanged
code covered by pre-existing suites (no new tests invented for unmodified
logic).

---

# Files Changed

```text
M AI_CALL_FLOW_AUDIT.md (repaired truncation + completed all required sections incl. F/BP/D IDs)
M src/app/api/dashboard/ai/route.ts (stream pre-flight, blocked/cache-hit rows, slot, embedding controls)
M src/app/api/dashboard/ai/route.test.ts (3 stream parity tests + richer boundary mocks)
M src/app/api/dashboard/workspace/route.ts (controls in auto-reindex)
M src/core/observability/operation-metrics.ts (additive model + tokens dimensions)
M src/core/observability/operation-metrics.test.ts (allowlist + rollup coverage)
M src/modules/ai/ai-embeddings.ts (guarded path + preserved legacy path)
M src/modules/ai/ai-service.ts (export slot acquire/release; no logic change)
?? src/modules/ai/ai-operation-guards.ts (NEW shared boundary)
?? src/modules/ai/ai-operation-guards.test.ts (NEW)
?? src/modules/ai/ai-embeddings-guards.test.ts (NEW)
Schema migrations: none. Production touched: no. Secrets read: no.
```

---

# Remaining AI Findings

```text
F-03 (P1) probe bypass, F-04 (P2) sweep key-in-URL, F-05 (P2) transcribe ×3,
F-06 (P3) legacy budget duplicate, F-07 (INFO) — all listed in the audit,
untouched by design (out of F-01/F-02 scope).
Residuals inside scope: stream uses first credential only (rotation) and
first-model-only rate limit (same scope as non-stream target-model check);
embeddings log estimated — not provider-reported — tokens (transports report none).
```

---

# Final Verdict

```text
AI REMEDIATION COMPLETE
```

(Both F-01 and F-02 fixed with regression tests green. The verdict covers only
these two findings — not the entire AI architecture; F-03..F-07 remain tracked.)

```text
FILES CHANGED: 8 modified + 3 new (+ audit repair)
TESTS RUN: full suite 3461 (plus typecheck, lint, perf)
TESTS PASSED: 3460
TESTS FAILED: 1 (pre-existing flaky ads UI test, unrelated, passes solo)
F-01 STATUS: FIXED
F-02 STATUS: FIXED
NEW BYPASS PATHS: 0
DUPLICATE INVOCATION STATUS: no new duplication; D-1..D-5 unchanged/residual
PRODUCTION TOUCHED: NO
SECRETS READ: NO
AI PROVIDERS CALLED: NO
AI TOKENS CONSUMED: NO
FINAL VERDICT: AI REMEDIATION COMPLETE
```
