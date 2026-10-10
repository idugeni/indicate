# AI CALL FLOW AUDIT — INDICATE

> **Historical baseline — 2026-10-11:** This is a point-in-time, pre-remediation source audit, not the current verdict for main. The follow-up [AI_REMEDIATION_REPORT.md](AI_REMEDIATION_REPORT.md) records F-01/F-02 as fixed. Re-check every finding against current code and tests before treating it as open; the remediation report is also a point-in-time claim, not proof of present runtime behavior.

> READ-ONLY, EVIDENCE-FIRST audit. No source, test, config, schema, Redis, provider, or deployment changes were made except creating this report file.
> Every claim below is tagged `OBSERVED IN CODE`, `INFERRED FROM CALL GRAPH`, `MODELLED`, or `UNKNOWN`.
> No AI providers were called. No tokens consumed. No secret values read or printed — env var NAMES only.

---

# Executive Summary

INDICATE's AI subsystem is **PARTIALLY CENTRALIZED** (see Final Verdict).

- One canonical generation orchestrator exists and is genuinely used by all dashboard text/image/audio flows: `executeAiQuery()` in `src/modules/ai/ai-service.ts:387` (OBSERVED IN CODE).
- One canonical HTTP entry for generation exists: `POST /api/dashboard/ai` in `src/app/api/dashboard/ai/route.ts:514,699` with 22 actions (OBSERVED IN CODE).
- The embedding subsystem (`src/modules/ai/ai-embeddings.ts:206,255,298`) reaches providers **without** passing through the budget/rate-limit/org-quota/breaker/usage-logging pipeline (OBSERVED IN CODE) — the single most important bypass.
- The streaming draft path (`handleDraftArticleStream`, `route.ts:248-512`) re-implements chain/credential/budget logic and **skips** the org-quota check and the injection scan that the non-stream path enforces (OBSERVED IN CODE).
- The admin credential probe (`AiService.testCredential`, `src/modules/integrations/ai-service.ts:207-266`) calls providers with a direct `fetch()` outside all AI guards (OBSERVED IN CODE).
- Actual generative providers reachable at runtime are DB-driven, not SDK-driven: `gemini` (GoogleGenAI SDK), `openrouter`, `vercel-gateway`, `openai-compatible` (all OpenAI-chat-completions `fetch`), plus `workers-ai` embeddings (`fetch` to Cloudflare). Cloudflare AI Gateway is an HTTP proxy for Gemini traffic, not a model provider (OBSERVED IN CODE).
- Worst-case provider amplification per single user request is **up to ~36 provider calls** for `transcribe-to-article` (3 sequential generations × 12-attempt cap), STATIC bound from code constants, MODELLED end-to-end (see §AI Load Amplification).

---

# AI Architecture Overview

```text
POST /api/dashboard/ai (22 actions) ──┐
dashboard UI (callAi / streamDraftArticle) ──→ fetch ──┘
                                              ↓
                              route.ts: serviceDeps() builds AiServiceDeps
                              (db, budget guard, rate-limit store,
                               semantic cache, resolveAdapter, gateway)
                                              ↓
                    ┌─────────────┬───────────┴──────────────┐
                    ↓             ↓                          ↓
          non-stream actions  draft-article-stream     embeddings actions
          (20 actions)        (own pipeline)           (semantic-search,
                    ↓             ↓                     embeddings-reindex)
            runQuery / runTaskQuery              embedQueryVector /
            (ai-usage.ts / ai-task-query.ts)     reindexArticleEmbeddings
                    ↓                            (NO guards — bypass)
            executeAiQuery (ai-service.ts:387)
              injection scan (non-staff) → global budget →
              org quota → routing policy → system/thinking/wrap →
              semantic cache → per-model RPM/TPM → chain build
              (policy + cascade, minus tripped breakers) →
              per-entry credentials → global slot → round-robin
              attempts (≤12, deadline-capped) →
              adapter.execute → success/fail bookkeeping →
              budget.record + ai_request_logs INSERT
                    ↓
            getAiAdapter / GeminiAdapterWrapper (adapter-registry.ts:43)
                    ↓
        ┌───────────┼───────────────┬───────────────┐
        ↓           ↓               ↓               ↓
  executeGemini-  OpenAiCompat-   OpenAiCompat-   OpenAiCompat-
  Adapter/Stream  ibleAdapter     ibleAdapter     ibleAdapter
  (gemini)        (openai-compat) (openrouter)    (vercel-gateway)
        ↓           ↓               ↓               ↓
  GoogleGenAI SDK fetch POST      fetch POST      fetch POST
  (+ optional Cloudflare          openrouter.ai   ai-gateway.vercel.sh
   AI Gateway baseUrl)            /api/v1         /v1
```

Side paths (all OBSERVED IN CODE):

```text
POST /api/dashboard/workspace (article.create/update)
  → after() → reindexArticleEmbeddings (ai-embeddings.ts:298)
  → embedArticleChunks → Workers AI fetch OR Gemini embedContent fetch
  → document_embeddings INSERT/DELETE (no AI guards, no ai_request_logs)

AiService.testCredential (via POST /api/dashboard/integrations, action ai.credential.test)
  → direct fetch() to generativelanguage :generateContent OR {baseUrl}/models
  → recordCredentialTest (no budget/rate-limit/quota/breaker/ai_request_logs)

GET /api/internal/maintenance/ai-model-sweep (cron 15 3 * * *)
  → direct fetch() to provider /models listings (catalog only, no generation)
  → diffCatalogModels → ai_models.isActive=false + audit log
```

---

# Complete AI Entry Points

## E-01 — POST /api/dashboard/ai (DIRECT, generative — the only generative entry)

- File: `src/app/api/dashboard/ai/route.ts:514` (`handlePOST`), exported `route.ts:699` as `POST = withApiAccess('POST /api/dashboard/ai', handlePOST)` — OBSERVED IN CODE.
- HTTP: `POST`, JSON `{ organizationId: uuid, action: enum[22], payload: record }` — `route.ts:40-67`.
- Auth: `sessionFor()` → `authenticateDashboardUser` + `authorizeDashboardOrganization`, non-disclosing denial on failure — `route.ts:179-188,519-520`. CSRF: `denyCrossSiteMutation` — `route.ts:516`.
- Tenant: `organizationId` from body, forwarded to every helper (`route.ts:533-683`), credential lookup (`route.ts:280`), cache scope (`route.ts:116`), logs (`route.ts:207,375-387`).
- Deps wiring: `serviceDeps()` (`route.ts:100-177`) + 7 `configure*` calls (`route.ts:522-529`).

All 22 actions (each `route.ts` line = OBSERVED IN CODE):

| # | action | route.ts | AI function (file:line) | Transport |
|---|---|---|---|---|
| 1 | draft-article | 533-534 | `generateArticleDraft` (`ai-usage.ts:323`) → `runQuery` (`ai-usage.ts:326`) → `executeAiQuery` (`ai-service.ts:387`) | non-stream text+JSON |
| 2 | draft-article-stream | 536-537 | `handleDraftArticleStream` (`route.ts:248-512`) → `executeGeminiStream` (`route.ts:415`) or `adapter.execute/executeStream` (`route.ts:392-413`) | SSE stream |
| 3 | suggest-tags | 539-541 | `suggestTags` (`ai-usage.ts:345`) → `runQuery` | non-stream |
| 4 | summarize-report | 543-545 | `summarizeReport` (`ai-usage.ts:368`) → `runQuery` | non-stream |
| 5 | moderation-reply | 547-549 | `draftModerationReply` (`ai-usage.ts:390`) → `runQuery` | non-stream |
| 6 | vision-draft | 551-553 | `ocVisionDraft` (`ai-usage.ts:520`) → `runQuery` + images | multimodal |
| 7 | cover-caption | 555-557 | `ocCoverCaption` (`ai-usage.ts:447`) → `runQuery` + images | multimodal |
| 8 | insight-narrative | 559-561 | `narrateInsights` (`ai-usage.ts:550`) → `runQuery` | non-stream |
| 9 | semantic-search | 563-614 | `embedQueryVector` (`ai-embeddings.ts:255`) → `embedArticleChunks` (`ai-embeddings.ts:206`); then `document_embeddings` SELECT + `rankSemanticCandidates`, ILIKE fallback | embedding (query) |
| 10 | embeddings-reindex | 615-628 | `reindexArticleEmbeddings` (`ai-embeddings.ts:298`) | embedding (doc) |
| 11 | seo-titles | 629-631 | `suggestTitles` (`ai-seo.ts:270`) → `runTaskQuery` (`ai-task-query.ts:36`) | non-stream |
| 12 | seo-meta | 633-635 | `suggestMetaDescription` (`ai-seo.ts:293`) → `runTaskQuery` | non-stream |
| 13 | seo-excerpt | 637-639 | `suggestExcerpt` (`ai-seo.ts:316`) → `runTaskQuery` | non-stream |
| 14 | seo-bundle | 641-643 | `suggestSeoBundle` (`ai-seo.ts:336`) → `runTaskQuery` | non-stream (1 call, 3 outputs) |
| 15 | polish-body | 645-647 | `polishBody` (`ai-polish.ts:39`) → `runQuery` | non-stream |
| 16 | classify-article | 649-654 | `classifyArticle` (`ai-polish.ts:98`) → `runQuery` | non-stream |
| 17 | cover-image | 656-659 | `generateCoverImage` (`ai-cover.ts:133`) → `runTaskQuery` + `modelOverride: COVER_MODEL` (`ai-cover.ts:17`) | image gen |
| 18 | tts-speak | 661-663 | `synthesizeSpeech` (`ai-tts.ts:100`) → `runTaskQuery` + `modelOverride: TTS_MODEL` (`ai-tts.ts:13`) | audio gen |
| 19 | transcribe-audio | 665-667 | `transcribeAudio` (`ai-transcribe.ts:90`) → `runTaskQuery` + `modelOverride: TRANSCRIBE_MODEL` (`ai-transcribe.ts:20`) | audio-in |
| 20 | transcribe-to-article | 669-674 | `transcribeToArticle` (`ai-transcribe.ts:141`): `transcribeAudio` (:147) + draft `runTaskQuery` (:154) + classify `runTaskQuery` (:169) | 3 sequential calls |
| 21 | publisher-verify | 676-678 | `verifyPublisher` (`ai-verify.ts:110`) → `runTaskQuery` (`ai-verify.ts:118`) | non-stream |
| 22 | assistant-chat | 680-683 | `assistantChat` (`ai-assistant.ts:97`) → `runTaskQuery` (`ai-assistant.ts:109`) | chat |

## E-02 — POST /api/dashboard/workspace (INDIRECT/BACKGROUND embedding reindex)

- File: `src/app/api/dashboard/workspace/route.ts:154-187` (`handlePOST`), exported `:195` — OBSERVED IN CODE.
- Trigger: successful `article.create` / `article.update` → `scheduleArticleReindex()` (`workspace/route.ts:172-174`), deferred via `after()` (`workspace/route.ts:137-152`).
- Auth: `contextFor()` → `authenticateDashboardUser` + `authorizeDashboardOrganization` (or access-key path) + `denyCrossSiteMutation` (`workspace/route.ts:50-83,156`).
- Tenant: `organizationId` from body or saved article; reindex strictly scoped (`ai-embeddings.ts:304-305`).
- AI: `reindexArticleEmbeddings` (`ai-embeddings.ts:298`), best-effort, never fails the save (`workspace/route.ts:129-136` comment).

## E-03 — AiService.testCredential via POST /api/dashboard/integrations (DIRECT provider probe, bypass)

- File: `src/modules/integrations/ai-service.ts:207-266` (`testCredential`); invoked from dashboard integrations route for action `ai.credential.test` — OBSERVED IN CODE (route wires `new AiService(...)`; probe itself is the direct caller).
- Trigger: dashboard admin clicks "test credential".
- Auth: platform AI grant (`this.canManage(actor)` — `ai-service.ts:209`).
- Tenant: actor org; model picked by `probeModelFor()` (`ai-service.ts:276-283`).
- AI: direct `fetch()` — Gemini `:generateContent` (`ai-service.ts:229-234`) or `{baseUrl}/models` GET (`ai-service.ts:235-239`). Consumes real provider quota/tokens (the Gemini ping sends `Ping. Balas dengan OK.`), outside all AI guards.

## E-04 — GET /api/internal/maintenance/ai-model-sweep (NON-GENERATIVE catalog listing)

- File: `src/app/api/internal/maintenance/ai-model-sweep/route.ts:34-168`, exported `:177` — OBSERVED IN CODE.
- Trigger: Vercel Cron `vercel.json:46-49` (`15 3 * * *`), `GET`.
- Auth: cron-secret Bearer, 404 on mismatch (`ai-model-sweep/route.ts:37`).
- Tenant: none/global.
- AI: provider **listing** `fetch` only (`fetchJson`, `:17-21` → `liveIds()`, `:75-98`: OpenRouter `/models`, Gemini `/v1beta/models?key=`, Vercel Gateway `/models`). No generation, no tokens beyond listing. Writes: `ai_models.isActive=false` + `runtime_config_audit_logs` (`:111-128`).

## E-05 — Client indirect triggers (all funnel to E-01)

- `callAi()` (`src/modules/ai/components/ai-client.ts:32-41`) → `fetch('/api/dashboard/ai', POST)`; `streamDraftArticle()` (`use-ai-stream.ts:127-181`) → same route with `draft-article-stream`. 15+ dashboard components call these on user gestures (draft assist, tag suggest, SEO assist, polish panel, cover generator, TTS panel, transcribe panel, media analyze, moderation assist, insight narrative, publisher verify, archive search, assistant dialog, article-form-state inline buttons, media library) — OBSERVED IN CODE (see Function-Level Matrix callers).
- Classification: INDIRECT. Auth/tenant inherited from E-01 session + `organizationId` arg.

## Non-AI / false positives (verified)

- `workers/` pageview beacon: only `request.text()` + Upstash pipeline `fetch`; no AI imports — NON-AI.
- `scripts/` (30 files): only `fail/mail/detail/available` substrings + OG-image `sharp` backfill; no `executeAiQuery` — NON-AI.
- `src/app/mcp/route.ts` + `src/modules/webmcp/`: 5 read-only tools (`site_info, search_articles, list_articles, list_categories, get_article`); no AI imports — NON-AI.
- `src/app/api/v1/commands/route.ts`: only `article.create, media.*, publication.*`; no AI — NON-AI.
- `src/modules/ai/eval/eval-runner.ts:37-53`: offline parser checks only — NON-AI.
- Server Actions: single `'use server'` file (`switch-organization-action.ts`), no AI — NON-AI.
- All other `src/app/**/route.ts` (sitemap, rss, robots, health, delivery, billing, moderation, publishing, workspace GET): no AI imports — NON-AI.

---

# Complete AI Call Graphs

## G-1 — Non-stream text/image/audio (19 of 22 actions; canonical path)

```text
POST /api/dashboard/ai (route.ts:514 handlePOST)
  ↓ sessionFor (179) → authenticateDashboardUser + authorizeDashboardOrganization
  ↓ denyCrossSiteMutation (516) → commandSchema (40) → serviceDeps(orgId) (100)
  ↓ configureAiUsage/Seo/Cover/Tts/Transcribe/Verify/Assistant (522-529)
  ↓ action switch (531-688) → task helper, e.g.
  │   generateArticleDraft (ai-usage.ts:323) / suggestTitles (ai-seo.ts:270) /
  │   polishBody (ai-polish.ts:39) / generateCoverImage (ai-cover.ts:133) /
  │   synthesizeSpeech (ai-tts.ts:100) / transcribeAudio (ai-transcribe.ts:90) /
  │   verifyPublisher (ai-verify.ts:110) / assistantChat (ai-assistant.ts:97)
  ↓ runQuery (ai-usage.ts:197, channel web, enableTools false) [or]
  │   runTaskQuery (ai-task-query.ts:36, channel web, enableTools false)
  ↓ executeAiQuery (ai-service.ts:387)
  ↓ [staff? skip : scanPromptForInjection (403)] → budget.checkAiBudgetSafeguard (433)
  ↓ [orgId≠null] getOrganizationQuotaLimits + checkOrganizationQuota (460-507)
  ↓ getActiveRoutingPolicy (509) → systemInstruction + resolveThinkingBudget (523-526)
  ↓ [non-staff] wrapUntrustedUserInput (529)
  ↓ semantic-cache lookup, target then fallback models (540-571,634-642)
  ↓ getAiModelLimits + checkAiModelRateLimit (574-614)
  ↓ chain: nextChainStartIndex (625, round_robin only) →
  │   resolveOrderedAiModelChain (626) → resolveCascadeChain (627) →
  │   isModelBreakerTripped filter (628-632)
  ↓ per entry: resolveAdapter (657) → getAvailableCredentials (663) →
  │   selectCredential (698) → decryptAiKey (702)
  ↓ [vercel-gateway] budget pre-check is inside route resolveAdapter wrapper
  │   (route.ts:121-124); min-tokens floor 2048 (ai-service.ts:705-707)
  ↓ executeWithTimeout → adapter.execute (710)
  │   ├─ gemini → GeminiAdapterWrapper (adapter-registry.ts:16) →
  │   │    executeGeminiAdapter (gemini-adapter.ts:283) →
  │   │    GoogleGenAI.models.generateContent (gemini-adapter.ts:301,330)
  │   │    [optional Cloudflare Gateway baseUrl+headers, gemini-adapter.ts:161-169]
  │   └─ openai-compatible/openrouter/vercel-gateway →
  │        OpenAiCompatibleAdapter.execute (openai-compatible-adapter.ts:363) →
  │        fetch POST {baseUrl}/chat/completions (openai-compatible-adapter.ts:394)
  ↓ success: recordKeySuccess + recordModelSuccess +
  │   budget.recordAiTokenUsage (730-732) + cache.store (749-753) +
  │   logAiRequest INSERT success (733-747) → return redactSecrets(text) (756)
  ↓ failure: classifyAiError (772) + recordKeyFailure (773) +
      recordModelInfraFailure if infra class (774-776) +
      logAiRequest INSERT failed (777-789) → next credential/model or exhausted (810)
```

Status: OBSERVED IN CODE end-to-end.

## G-2 — draft-article-stream (dedicated pipeline)

```text
POST /api/dashboard/ai action=draft-article-stream (route.ts:536-537)
  ↓ handleDraftArticleStream (route.ts:248-512)
  ↓ buildDraftArticleInput (256) → scanPrompt secret check (258)
  ↓ budget.checkAiBudgetSafeguard (260) [NO org-quota check — bypass BP-4]
  ↓ getActiveRoutingPolicy (264) [NO injection scan — bypass BP-4]
  ↓ chain restricted to primary provider (272) + resolveCascadeChain (273)
  ↓ breaker filter (275-278) → semantic-cache shortcut per model (291-312)
  ↓ per-model rate-limit on effectiveChain[0] only (314-325)
  ↓ SSE ReadableStream loop (326-508), per entry:
  │   resolveStreamCredential: getAvailableCredentials + decryptAiKey (279-286)
  │   ├─ non-gemini: adapter.executeStream if present (392-407) else
  │   │    adapter.execute + single delta send (408-413)
  │   └─ gemini: executeGeminiStream (415-427, gateway forwarded)
  │   succeed → recordKeySuccess + recordModelSuccess +
  │     budget.recordAiTokenUsage + auditDraftStream INSERT success (370-387)
  │   failure → classifyAiError + recordKeyFailure +
  │     recordModelInfraFailure (452-458) + auditDraftStream INSERT failed (461-495)
```

Differences from G-1 (OBSERVED IN CODE): primary-provider-only chain, first-model-only rate limit, no org quota, no injection scan/wrap, no per-key retry (one attempt per chain entry with a single inter-entry backoff `computeRetryDelayMs(1)` at `route.ts:355`), no global concurrency slot, no cascade beyond primary provider.

## G-3 — semantic-search (embedding + DB)

```text
POST /api/dashboard/ai action=semantic-search (route.ts:563-614)
  ↓ embedQueryVector (ai-embeddings.ts:255) → embedArticleChunks (ai-embeddings.ts:206)
  ↓ [auto] embedTextsViaWorkersAi (workers-ai-embedding.ts:89:
  │    POST https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/{model})
  │    on all-null → resolveApiKey(db,'gemini') (ai-router.ts:1027) → decryptAiKey
  │    → embedTexts (embeddings.ts:158:
  │       POST https://generativelanguage.googleapis.com/v1beta/models/{m}:embedContent)
  ↓ SELECT document_embeddings WHERE organization_id=… ORDER BY created_at DESC
  │    LIMIT 100 (route.ts:574-580) → toSemanticCandidate → rankSemanticCandidates
  │    (cosine, threshold 0.35, topK clamp — embeddings.ts:73-114)
  ↓ hits>0 → JSON : else ILIKE fallback SELECT … LIMIT 20 (route.ts:601-613)
```

Guards on this path: tenant-scoped SELECT only. No budget/rate-limit/quota/breaker/`ai_request_logs` — bypass BP-1 (OBSERVED IN CODE).

## G-4 — embeddings-reindex + workspace auto-reindex (embedding + write)

```text
POST /api/dashboard/ai action=embeddings-reindex (route.ts:615-628) [or]
POST /api/dashboard/workspace article.create/update → after() → scheduleArticleReindex
  ↓ reindexArticleEmbeddings (ai-embeddings.ts:298):
  │   SELECT articles WHERE organization_id+id (304)
  │   → splitArticleChunks ≤20 (EMBEDDING_MAX_CHUNKS)
  │   → embedArticleChunks (same transports as G-3)
  │   → INSERT document_embeddings (id,org,article,chunk,embedding::jsonb) (338)
  │   → DELETE stale rows NOT IN new ids (341)
```

Same guard gap as G-3 (OBSERVED IN CODE).

## G-5 — transcribe-to-article (fan-out: 3 sequential G-1 calls)

```text
POST /api/dashboard/ai action=transcribe-to-article (route.ts:669-674)
  ↓ transcribeToArticle (ai-transcribe.ts:141-182)
  ↓ ① transcribeAudio (:147) → runTaskQuery TRANSCRIBE_MODEL
  ↓ ② draft runTaskQuery ARTICLE_DRAFT_SCHEMA (:154)
  ↓ ③ classify runTaskQuery CLASSIFY_ARTICLE_SCHEMA (:169)
```

Each leg is a full G-1 pipeline with its own guards/retries/logs (INFERRED FROM CALL GRAPH; each `runTaskQuery` → `executeAiQuery` observed).

## G-6 — credential probe (admin, guard-bypassing)

```text
dashboard integrations UI → POST /api/dashboard/integrations (ai.credential.test)
  ↓ AiService.testCredential (ai-service.ts:207)
  ↓ decryptCredentialKey → getPolicy → probeModelFor (276)
  ↓ fetch() direct (:227-239) → recordCredentialTest / recordBlockedCredential
```

No budget/rate-limit/quota/breaker/semantic-cache/`ai_request_logs` (OBSERVED IN CODE).

## G-7 — model sweep (cron catalog, non-generative)

```text
cron → GET /api/internal/maintenance/ai-model-sweep (route.ts:34)
  ↓ authorized(cronSecret) → SELECT providers/models/credentials (46-59)
  ↓ decryptFirst (61-73, SQL decrypt_ai_key)
  ↓ liveIds per provider (75-98, fetchJson listings)
  ↓ diffCatalogModels → UPDATE ai_models SET isActive=false +
      INSERT runtime_config_audit_logs (111-128)
  ↓ findDanglingPolicyModels → warnings only
```

No generation (OBSERVED IN CODE).

---

# AI Router Analysis

## ai-router.ts (DB-driven control plane, 1037 lines)

| Function | Purpose | Called by | Calls | Key constant |
|---|---|---|---|---|
| `getActiveRoutingPolicy(db)` (:253) | Load singleton `ai_routing_policies id='default'`; null when unconfigured | `ai-service.ts:509`, stream `route.ts:264` | SQL select | — |
| `getModelOwnerProvider(db,model)` (:318) | Owner provider for a `modelOverride` | `ai-service.ts:623` | SQL select | — |
| `resolveAiModelChain(policy,modelOverride,providerOverride)` (:346) | primary→fallback (or single on override) | `ai-chain-health`, `ai-service` via ordered | — | — |
| `nextChainStartIndex(store)` (:396) | Round-robin cursor `INCRBY ai:chain:cursor` | `ai-service.ts:625`, stream `:271` | `aiScopedKey`, `recordAiGate ai.cursor` | `AI_CHAIN_CURSOR_KEY='ai:chain:cursor'` (:370) |
| `resolveOrderedAiModelChain` (:418) | Rotate only when `chainStrategy='round_robin'` | same as above | — | — |
| `getCascadeModels` (:495) | Same-provider text models by priority, excludes `NON_CHAT_TASKS` (:474) | `resolveCascadeChain` | SQL select | `AI_MAX_CHAIN_ENTRIES=4` (:465) |
| `resolveCascadeChain` (:565) | Append cascade, skip on override | `ai-service.ts:627`, stream `:273` | `getCascadeModels` | cap 4 |
| `isModelBreakerTripped` (:651) | Read `ai:breaker:{p}:{m}`, half-open check | `ai-service.ts:628`, stream `:276` | `store.get`, `recordAiGate ai.breaker` | threshold 5/120s (:433-438) |
| `recordModelInfraFailure` (:684) | `SET count:now + EXPIRE 120s` (or INCRBY fallback) | `ai-service.ts:774`, stream `:457` | store set/incrby/expire | classes (:449-456) |
| `recordModelSuccess` (:743) | `EXPIRE key 1s` (delete surrogate) | `ai-service.ts:731`, stream `:373` | store expire | — |
| `getAvailableCredentials` (:770) | Auto-recover expired cooldowns; select active (global or org) by priority/`last_used_at` | `ai-service.ts:663`, stream `:280` | SQL select+update, `decryptAiKey` via `resolveApiKey` | limit 100 |
| `selectCredential` (:815) | `round_robin/random/least_used/lowest_error_rate/priority_based/health_aware` | `ai-service.ts:698` | in-memory | — |
| `classifyAiError` (:871) | `retry_after:`, `http NNN`, quota/rate/invalid/timeout/network/safety strings; default retryable `application_error`; `safety_blocked` non-retryable | `ai-service.ts:772`, stream `:452` | — | — |
| `recordKeySuccess/Failure` (:965/:992) | Single-statement telemetry; cooldown 60s default on rate/quota/invalid | `ai-service.ts:730,773`, stream | SQL update | `cooldownDurationSec` policy |
| `resolveApiKey` (:1027) | First credential + `decryptAiKey` | embeddings `:234`, sweep analog | `getAvailableCredentials` | — |
| `resolveThinkingBudget/resolveTaskThinkingBudget` (:191/:236) | `caption:1024, seo:2048, polish/summarize:8192` | `ai-service.ts:526` | — | `AI_TASK_THINKING_BUDGET` (:221) |

Side effects: Redis cursor/breaker writes; `ai_credentials` counters/cooldowns; never logs plaintext keys (`describeUpstreamError` redacts — `gemini-adapter.ts:44-54`).

## ai-service.ts (`executeAiQuery`, :387-821 — the canonical pipeline)

Order OBSERVED IN CODE: staff-gated injection scan → global budget → org quota (pre-charge doubles as usage record, `:467-468` comment) → policy → system/thinking/wrap → semantic cache (gate `!images && !media && history≤2 && len≥6`, `:540-541`; store `len>20`, `:749`) → RPM/TPM → chain minus tripped breakers → per-entry credentials → in-process global slot (`acquireAiGlobalSlot`, `:289`; fail-open when limit unset) → round-robin rounds capped by `AI_MAX_TOTAL_ATTEMPTS=12` (`:246`) and `min(timeout×entries, 180000)` (`:681-682`) → `executeWithTimeout` (`AbortSignal.timeout` race, `:323`) → success/fail bookkeeping → `redactSecrets` return.

Special case: `providerId==='vercel-gateway'` forces `maxOutputTokens=max(…,2048)` (`:705-707`, `GATEWAY_FALLBACK_MIN_TOKENS=2048`, `:165`).

Failure behavior: non-retryable errors return a safe user message immediately (`:790-802`); retryable errors iterate credentials/models; exhaustion returns `ALL_RETRIES_EXHAUSTED` (`:810-820`). All guard blocks write `ai_request_logs status='blocked'` with guardrail provider ids; `ROUTING_UNCONFIGURED` writes nothing (`:510-522`).

## ai-task-query.ts / ai-task-profiles.ts / ai-usage.ts et al

- `runTaskQuery` (`ai-task-query.ts:36-76`): staff-guard wrapper (`scanPrompt` secret check `:45`, thinking override `:48-49`, `executeAiQuery channel web enableTools false`, busy-mask on error/empty `:68-70`).
- `TASK_MODEL_PROFILE` (`ai-task-profiles.ts:33-43` and mirrored `ai-embeddings.ts:51-59`): `caption 0.3/1024, seo 0.5/2048, polish 0.5/8192, summarize 0.3/8192, transcribe 0.2/1024, tts 0.3/0, cover 0.8/0, chat 0.7/—`.
- Task helpers (`ai-usage`, `ai-seo`, `ai-polish`, `ai-cover`, `ai-tts`, `ai-transcribe`, `ai-verify`, `ai-assistant`): fixed system prompts, fixed temperature/`maxOutputTokens`/schema/`thinkingTask`, `truncateInput` caps, `parse*` + `BUSY_MESSAGE` on unparseable output. No direct provider access (OBSERVED IN CODE).

---

# Provider Inventory

| Provider id | Gateway / transport | SDK / HTTP client | Base URL (code) | Auth | Request / response | Streaming | Structured | Tools | Embed | Vision |
|---|---|---|---|---|---|---|---|---|---|---|
| `gemini` | Direct, or Cloudflare AI Gateway proxy when `CLOUDFLARE_AI_GATEWAY_SLUG` set | `@google/genai` `GoogleGenAI` (`gemini-adapter.ts:3,171-173`) | default Generative Language host; gateway override `https://gateway.ai.cloudflare.com/v1/{account}/{slug}/google-ai-studio` (`cloudflare-gateway.ts:4,58-61`) | Router-supplied decrypted `ai_credentials` key; `x-goog-api-key` for embeddings (`embeddings.ts:180`) | `models.generateContent` (`gemini-adapter.ts:301,330`); usage `usageMetadata→{prompt,completion,total}` (`:335-344`) | Yes (`generateContentStream`, `:207`; `executeGeminiStream`) | Yes (`responseMimeType`+schema passthrough, `buildConfig`) | Yes, max 3 tool turns (`MAX_TOOL_TURNS=3`, `:13`) | Yes (`:embedContent`, `embeddings.ts:116-118`, model `gemini-embedding-2`) | Yes (≤4 images, ≤1 audio; `:15`, `:201-202`) |
| `openai-compatible` | None (generic) | `fetch` (`openai-compatible-adapter.ts:394,440`) | Default `https://api.openai.com/v1` (`openai-compatible-adapter.ts:371`); probe map duplicates it (`ai-service.ts:82`) | Bearer router key + optional extra headers | `POST {base}/chat/completions`; usage `prompt_tokens/completion_tokens/total_tokens` (`:403-416`) | Yes (`executeStream`, SSE parse `:266-356`) | Yes (`json_schema strict` / `json_object`, `:92-105`) | Via body passthrough | UNKNOWN (no code path) | Yes (`image_url data:` ≤4, `:113-132`) |
| `openrouter` | OpenRouter | `fetch` via same adapter, routing `{sort:'throughput',allowFallbacks:true}`, header `X-Title: Indicate` (`adapter-registry.ts:29-32`) | `https://openrouter.ai/api/v1` (`openrouter-gateway.ts:4`) | Bearer router key | Same OpenAI-chat shape | Yes (inherited) | Yes (schema lowercased `:62-83`) | Via body | No | Yes (inherited) |
| `vercel-gateway` | Vercel AI Gateway | `fetch` via same adapter (`adapter-registry.ts:33`) + Redis monthly budget wrapper in route (`route.ts:121-124,161-163`) | `https://ai-gateway.vercel.sh/v1` (`vercel-gateway.ts:9`) | Bearer router key (credential row required; "no key" test only checks registration, not execution) | Same OpenAI-chat shape | Yes if adapter supports (`asStreamCapableAdapter`, `route.ts:95-98`) | Yes | Via body | No | Yes (inherited) |
| `workers-ai` | Cloudflare Workers AI (embeddings only) | `fetch` (`workers-ai-embedding.ts:102-106`) | `https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/{model}` (`workers-ai-embedding.ts:57-60`) | `Authorization: Bearer` Cloudflare API token (env `CLOUDFLARE_API_TOKEN`, NOT a model key) | `{text: payload}`; per-batch nulls on failure | No | No | No | Yes (`@cf/baai/bge-base-en-v1.5` default, `:6`) | No |

NOT providers (OBSERVED IN CODE): `openai`, `anthropic`, `vertex` — no SDK, no base URL, no adapter; model ids `openai/gpt-4o-mini` and `anthropic/claude-3.5-haiku` are **OpenRouter model strings**, not direct-provider integrations. Cloudflare AI Gateway is a cache/observability proxy, not a model host.

Env var NAMES (values never read): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_GATEWAY_SLUG`, `CLOUDFLARE_AI_GATEWAY_CACHE_TTL_SECONDS`, `CLOUDFLARE_AI_EMBEDDING_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`. Provider/model keys live in DB (`ai_credentials.key_encrypted`, envelope-encrypted via `ai_master_secrets`), never in env (OBSERVED IN CODE: `.env.example:53-67`, `bootstrap-schema.ts:59-66`, `ai-crypto.ts:37-67`).

---

# Model Inventory

| Flow | Provider | Gateway | Model | Selection method | Fallback |
|---|---|---|---|---|---|
| Default chat/draft/tags/summary/moderation/insight/assistant | `gemini` (or operator-configured primary) | Cloudflare GW optional | `gemini-2.5-flash` seed default (`20260930030000:199`); live default = `ai_routing_policies.default_model` | DATABASE (`ai_routing_policies` + `ai_models`) | `fallback_model` + cascade (same-provider priority order, cap 4) |
| Heavy analysis | `gemini` | optional | `gemini-3.7-flash` | DATABASE catalog | cascade |
| Default public chat workhorse | `gemini` | optional | `gemini-3.6-flash` (`is_default=true` seed) | DATABASE | cascade |
| Deep review | `gemini` | optional | `gemini-2.5-pro` (RPM 15→2, TPM 1M→32K: restrictive) | DATABASE | cascade |
| Extraction/tagging | `gemini` | optional | `gemini-3.1-flash-lite` (RPM 30, TPM 2M) | DATABASE | cascade |
| Research agent | `gemini` | optional | `deep-research-preview` | DATABASE (excluded from cascade: `NON_CHAT_TASKS`) | none via cascade |
| Cover image | `gemini` | optional | `gemini-3.1-flash-image` (`COVER_MODEL`, `ai-cover.ts:17`) | HARDCODED override + DATABASE owner lookup (`getModelOwnerProvider`, `ai-service.ts:623`) | chain on owner provider |
| TTS | `gemini` | optional | `gemini-3.8-flash-tts` (`TTS_MODEL`, `ai-tts.ts:13`) | HARDCODED override + DATABASE | same |
| Transcription | `gemini` | optional | `gemini-3.5-transcribe` (`TRANSCRIBE_MODEL`, `ai-transcribe.ts:20`) | HARDCODED override + DATABASE | same |
| Chat via OpenRouter | `openrouter` | OpenRouter | `openai/gpt-4o-mini`, `anthropic/claude-3.5-haiku` | DATABASE (operator flips `primary_provider_id`) | cross-model within provider |
| Vercel gateway models | `vercel-gateway` | Vercel | any gateway model string in `ai_models` (none seeded) | DATABASE (operator-added) | same-provider cascade |
| Text embeddings (primary) | `workers-ai` | Cloudflare Workers AI | `@cf/baai/bge-base-en-v1.5` (default; override `CLOUDFLARE_AI_EMBEDDING_MODEL`) | ENV-CONFIGURED with code default | Gemini embedding |
| Text embeddings (fallback) | `gemini` | direct | `gemini-embedding-2` (`GEMINI_EMBEDDING_MODEL`, `embeddings.ts:4`) | HARDCODED default, REQUEST-override (`options.model`) | none (nulls) |

Model-change locations (OBSERVED IN CODE): dashboard AI management panel → `ai_models`/`ai_routing_policies` CRUD (`src/data/repos/ai.ts`, `AiService`); cron auto-deactivate (`ai-model-sweep`); the three `*_MODEL` constants; `CLOUDFLARE_AI_EMBEDDING_MODEL` env; per-request `modelOverride` (modality tasks only). No request-selected arbitrary models: `modelOverride` is set by server code, never by client payload (client sends `action`+fields; `commandSchema` has no model field — `route.ts:40-67`).

---

# Prompt / Input Flow

```text
raw user input (dashboard form / file bytes)
  ↓ route-level str(value,max) truncation per action (route.ts:533-683; e.g. topic 300, body 8000, base64 7-10M)
  ↓ [non-stream] scanPrompt secret-pattern reject (ai-usage.ts:53-59) +
  │   [non-staff] scanPromptForInjection 17 patterns + 1500ch cap (ai-security.ts:83-104)
  │   [stream] secret check only (route.ts:258); NO injection scan (bypass BP-4)
  ↓ [non-staff] wrapUntrustedUserInput strips <system-reminder>/<instructions>/<|im_start|> + wraps
  │   <untrusted_user_query> (ai-security.ts:112-120); [stream] none
  ↓ system prompt: fixed per-task constants (DRAFT_SYSTEM ai-usage.ts:243, SEO_* ai-seo.ts,
  │   COVER_SYSTEM ai-cover.ts:33, TTS instruction ai-tts.ts:17, TRANSCRIBE_* ai-transcribe.ts:33-42,
  │   VERIFY_SYSTEM ai-verify.ts:64, default public/staff ai-service.ts:54-58) +
  │   thinking budget (task profile) + responseSchema
  ↓ context injection: article DB rows (title/excerpt/body → chunks ≤2000ch, ≤20),
  │   retrieved data wrapped via wrapUntrustedRetrievedData (redactSecrets + <untrusted_context>)
  ↓ multimodal: images ≤4 allowlist jpeg/png/webp (ai-usage.ts:287), audio ≤1, base64 regex,
  │   MIME allowlists (cover/tts/transcribe), byte caps (cover 5MiB, TTS 5MiB, transcribe 10M chars)
  ↓ provider request (history tail ≤6 gemini / ≤10 guard, temperature/thinking/maxTokens per profile)
```

- System prompts: created at the constants cited above. PURPOSE/INPUTS/OUTPUT-CONTRACT reported instead of bodies per task rules (bodies are short Indonesian editorial instructions + anti-hallucination grounding + JSON-shape directives; full text in the cited lines).
- Tenant data enters via `organizationId`-scoped article reads and credential selection; external content enters only as operator-pasted text/base64 (no server-side URL fetching on AI paths — no SSRF vector found).
- Prompt templates: static strings + `PROMPT_REGISTRY v1` (`prompt-registry.ts:33-58`, tasks `seo-bundle`/`polish`/`caption` with `{{title}}`/`{{body}}` slots, `getPromptTemplate` throws on unknown task/version). Promotion requires zero-failure `runPromptEval` (`prompt-registry.ts:5-11`, `eval-runner.ts:39-42`) — OBSERVED IN CODE.
- Embedding inputs: archive query (≤200 chars at route, `route.ts:564`) or article chunks (≤2000 chars × ≤20, `ai-embeddings.ts:140-179`). No injection scan, no secret scan, no length-cap rejection on the embedding path (only truncation) — OBSERVED IN CODE, part of F-01.

---

# Output / Response Flow

```text
provider response
  ↓ adapter parse: Gemini usageMetadata→{prompt,completion,total} (gemini-adapter.ts:335-344),
  │   OpenAI-compatible usage{prompt_tokens,completion_tokens,total_tokens} (openai-compatible-adapter.ts:403-416),
  │   embeddings extractVector→finite vector|null (embeddings.ts:140-145, toFiniteVector :54-64, dim cap 4096)
  ↓ empty-text+no-media → malformed_response failure, no fallback value (ai-service.ts:711-728)
  ↓ redactSecrets on every returned text incl. stream deltas (ai-service.ts:756, route.ts:388,400,411,423)
  ↓ schema validation: responseMimeType application/json + Gemini-style schema (ai-response-schemas.ts:1-199:
  │   ARTICLE_DRAFT, TAG_SUGGESTION, MODERATION_ANALYSIS, COVER_CAPTION, VISION_DRAFT,
  │   SEO_TITLES/META/EXCERPT/BUNDLE, POLISH_BODY, CLASSIFY_ARTICLE, TRANSCRIPT, PUBLISHER_VERIFY)
  ↓ parse* helpers with hard slices (parseArticleDraft title 160/excerpt 400/content 20000/slug 120 —
  │   ai-usage.ts:98-115; parseTagSuggestion, parseModerationAnalysis, parseCoverCaption,
  │   parseVisionDraft, parseTranscript ≤20000 — ai-transcribe.ts:59-80; parseVerification —
  │   ai-verify.ts:38-62; parseClassification — ai-polish.ts) → null → BUSY_MESSAGE, no retry after
  │   invalid output (ai-usage.ts:235,334,356,380,466,539)
  ↓ business logic → dashboard JSON {ok:true,…} or {ok:false,error:BUSY} (route.ts:531-688)
  ↓ embeddings: vectors → document_embeddings.embedding::jsonb, nulls stored as NULL (ai-embeddings.ts:329-340);
  │   search hits → rankSemanticCandidates (threshold 0.35, topK ≤20 → route slices ≤20)
```

- Streaming: deltas sent as SSE `data: {delta}` then terminal `event: done {text}` or `event: error` (route.ts:329-335,388,449,476,496). Partial-response behavior: after any delta (`sentAny=true`), failure ends the stream with error and NO fallback to the next provider (route.ts:455-460) — OBSERVED IN CODE, correct per Phase-4 semantics.
- No markdown processing beyond `stripCodeFence`/`truncateInput`/`slugify`; no truncation-retry; no fallback text (busy message instead).

---

# Retry / Fallback / Breaker

Non-stream (`ai-service.ts:616-808`, OBSERVED IN CODE):

```text
chain entry (provider:model, ≤4 via AI_MAX_CHAIN_ENTRIES — ai-router.ts:465)
   ↓ per entryBudget attempts (interactive: min(policy.maxRetries≤10, creds); background: creds.length)
   ↓ per credential ≤ perKeyLimit reuses (interactive: policy.perKeyRetryLimit clamp 1-5; background: 5)
   ↓ failure(class retryable) → sleep(computeRetryDelayMs(n)=min(500*2^(n-1),3000)+jitter<500 — :207-211)
   ↓ next credential → … → next chain entry
   ↓ stop at AI_MAX_TOTAL_ATTEMPTS=12 (:246) or overallDeadline=min(timeoutMs×entries,180000) (:681-682)
   ↓ ALL_RETRIES_EXHAUSTED
failure(non-retryable: safety_blocked/invalid_key class) → immediate safe message, no further attempts (:790-802)
failure(empty text, no media) → malformed_response, continue to next attempt (:711-728)
infra classes (provider_unavailable/timeout/rate_limit/quota_exhausted/application_error/malformed_response —
  AI_BREAKER_ERROR_CLASSES ai-router.ts:449-456) → recordModelInfraFailure; 5-in-120s trips breaker (:433-438)
credential classes rate_limit/quota_exhausted/invalid_key → cooldown_until=now+cooldownDurationSec (default 60s),
  invalid→status invalid else cooldown (ai-router.ts:1002-1007)
```

Stream (`route.ts:344-496`): one attempt per chain entry (primary-provider entries only), single `computeRetryDelayMs(1)` sleep between entries (:355), retryable+`!sentAny` → `continue` (next entry), else audit + terminal error. No per-key retry, no total-attempt cap beyond chain length, no overall deadline beyond per-stream `AbortSignal.timeout(timeoutMs)` (:348).

Embeddings: Workers AI 1 batch POST + 1 retry after 250ms on 429/5xx (`workers-ai-embedding.ts:89-131` per subagent trace); Gemini `embedTexts` serial per text, 1 retry per text on 429/5xx after 250ms (`embeddings.ts:194-208`). No breaker, no chain (auto falls Workers AI → Gemini once, `ai-embeddings.ts:206-244`).

Retries multiply provider/token usage: YES for generation (each attempt is a billed provider call; budget records only the successful call's tokens — `ai-service.ts:732` — so retry spend is unobserved in `recordAiTokenUsage`, though `ai_request_logs` failed rows record per-attempt latency/error with zero tokens).

---

# Rate Limit / Quota / Budget

Enforcement order per generative request (OBSERVED IN CODE, `ai-service.ts:433-614`):

```text
request → global budget (250k tokens/day + 60 req/hour, {namespace}:ai:budget:* — ai-security.ts:182-228)
        → org quota (daily requests/tokens from organizations table, {namespace}:ai:quota:org:* — ai-rate-limit.ts:339-418)
        → per-model RPM/TPM (ai_models.rpm_limit/tpm_limit, 60s window, Lua atomic when eval available —
            ai-rate-limit.ts:190-253, keys ai:limit:rpm/tpm:{model}:{window})
        → provider (breaker-filtered chain)
```

| Control | Scope | Key (normalized) | TTL | Enforcement point | Fail mode |
|---|---|---|---|---|---|
| Global budget | all AI | `{ns}:ai:budget:tokens:{YYYY-MM-DD}`, `{ns}:ai:budget:reqs:{YYYY-MM-DDTHH}` | 48h / 2h | `executeAiQuery` :433, stream :260 | fail-open |
| Org quota | per org | `{ns}:ai:quota:org:req/{tok}:{org}:{day}` | 48h | `executeAiQuery` :460-507; stream MISSING (F-02) | fail-open |
| Model RPM/TPM | per model | `{ns}:ai:limit:rpm/tpm:{model}:{window}` | 60s | `executeAiQuery` :574-614 (target model); stream :314-325 (first chain model) | fail-open |
| Vercel GW pool | per org(pool) | `{ns}:ai:vercel-gateway:tokens:{scope}:{YYYY-MM}` | to month-end ≥3600s | route `resolveAdapter` wrapper :121-124 + record :162 | fail-open |
| Breaker | per provider:model | `{ns}:ai:breaker:{provider}:{model}` | 120s window | chain filter + record on infra failure | fail-open (tripped=false) |
| Chain cursor | global | `{ns}:ai:chain:cursor` | none | round_robin only | fail-open (0) |

`rpd_limit` column exists but is unenforced in code (OBSERVED IN CODE via grep: no reader). `costMode price` forces OpenRouter `sort: price` (routing preference only, no monetary math). Legacy duplicate guard `integrations/ai/ai-budget.ts` (same caps, GLOBAL keys, no namespace) is superseded by `ai-security.ts` but still present — F-06.

Bypass summary: embeddings skip ALL rows above (F-01); stream skips org-quota row (F-02); credential probe and sweep listings skip all (F-03/F-04, admin/cron-scoped).

---

# Redis AI Flow

All keys namespaced via `aiScopedKey(namespace, key)` → `{namespace}:ai:*` (`ai-redis-namespace.ts:28-31`, namespace `indicate:{env}:v{cacheVersion}`); writes always namespaced, reads fall back to legacy global except 60s RPM/TPM, 120s breaker, and TTL-less cursor (documented, `:15-24`).

| Key pattern | Command | TTL | Purpose | R/W | Failure behavior |
|---|---|---|---|---|---|
| `{ns}:ai:budget:tokens:{day}` / `:ai:budget:reqs:{hour}` | GET×2 check; INCRBY/INCR+EXPIRE record | 48h/2h | global budget | both | fail-open allow |
| `{ns}:ai:quota:org:req/{tok}:{org}:{day}` | GET check-then INCRBY+EXPIRE | 48h | org quota | both | fail-open allow |
| `{ns}:ai:limit:rpm/tpm:{model}:{window}` | EVAL Lua (1 RTT) or GET→INCRBY+EXPIRE | 60s | model RPM/TPM | both | fail-open allow |
| `{ns}:ai:breaker:{provider}:{model}` | GET read; SET count:now+EXPIRE or INCRBY; EXPIRE 1s on success (delete surrogate) | 120s/1s | breaker | both | fail-open untripped |
| `{ns}:ai:chain:cursor` | INCRBY | none | round-robin rotation | write+read | fail-open 0 |
| `{ns}:ai:vercel-gateway:tokens:{scope}:{month}` | GET check; INCRBY+EXPIRE record | month-end | gateway pool | both | fail-open allow |

No Lua except `AI_RATE_LIMIT_LUA` (`ai-rate-limit.ts:62-70`). No production Redis access performed; patterns from code only. No `FLUSH`/delete of live keys anywhere in AI code (OBSERVED IN CODE).

---

# Token / Cost Flow

```text
provider response → adapter tokensUsage{prompt,completion,total}
  → budget.recordAiTokenUsage(total) [global daily counter only — ai-service.ts:732; stream route.ts:374]
  → vercelBudget.record(total) [gateway pool only — route.ts:162]
  → ai_request_logs(prompt,completion,total) [per-request attribution — ai-service.ts:733-747, route.ts:375-387]
  → aggregates: getTokenUsageByOrg / getOrganizationTokenUsage = SUM(total_tokens) GROUP BY model/org,
     caps LIMIT 50/25 (repos/ai.ts:594-618,830-853)
```

- Provider consistency: Gemini reports `usageMetadata`, OpenAI-compatible reports `usage.*_tokens`; embeddings report NOTHING (no usage fields in either transport) — usage unobserved for embeddings (F-01).
- Estimated tokens (`estimateAiInputTokens` = chars/4) charged optimistically to TPM + org-token quota pre-call; retries NOT counted in budget (only success records); failed requests log zero tokens; fallback-provider usage counted only if it is the winning attempt; streaming usage captured from final result (`result.tokensUsage`, deltas carry none); tenant+user attribution: tenant yes (`organization_id` on every row), user no (no user column; `correlationId=requestId` only).
- No price/cost math anywhere (no rates, no currency). "Budget" = token/request counters, not money.

---

# Persistence / Logging

| Writer | Table | Columns | Timing | Statuses |
|---|---|---|---|---|
| `logAiRequest` (`ai-service.ts:147-156`) | `ai_request_logs` | correlation_id, channel, provider_id, model_name, credential_id, organization_id, status, retry_count, latency_ms, prompt/completion/total_tokens, tools_executed (empty→NULL), error_class/message (sliced 500) | every block, every attempt-failure, every success, cache hits | success/failed/blocked |
| `auditDraftStream` (`route.ts:190-212,375-495`) | `ai_request_logs` | same (channel always 'web', tools NULL) | stream success/fail/exhausted/abort | success/failed only ('blocked' missing — F-02) |
| `recordKeySuccess/Failure` (`ai-router.ts:965-1015`) | `ai_credentials` | total/success/failed/rate_limit/quota counters, avg_latency, cooldown_until, status transitions | every attempt | — |
| `reindexArticleEmbeddings` (`ai-embeddings.ts:338-343`) | `document_embeddings` | id, organization_id, article_id, chunk (≤2000ch), embedding jsonb (or NULL) | per reindex | ok/failures in return value only |
| sweep (`ai-model-sweep/route.ts:111-128`) | `ai_models` + `runtime_config_audit_logs` | isActive=false + audit row | per deactivation | — |
| `recordCredentialTest/Blocked` (`repos/ai.ts`) | `ai_credentials` | probe outcome counters | per probe | — |

- `ai_request_logs` RLS: `runtime_insert WITH CHECK(true)`, `runtime_select USING(true)`, GRANT SELECT+INSERT only (insert-only observability; `20260930030000:225-232`). `status` enum (`success|failed|blocked` — `schema/ai.ts:22`) and free-text `channel` allow embedding rows with NO migration.
- Failures without a persisted record: `ROUTING_UNCONFIGURED` (no log — `ai-service.ts:510-522`), stream guard blocks + stream cache-hit shortcut (no rows — F-02), ALL embedding outcomes (no rows — F-01).

---

# Master AI Call Map

```text
                    ┌──────────────────────────────────┐
                    │ POST /api/dashboard/ai (route.ts)│
                    │ 22 actions, dashboard session+org │
                    └───────┬──────────────┬───────────┘
                            ↓              ↓                       ↓
              non-stream (19 actions)  stream (1)            embeddings (2)
                runQuery/runTaskQuery  handleDraftArticleStream  embedQueryVector/
                (ai-usage/ai-task-query) (route-local pipeline)  reindexArticleEmbeddings
                            ↓              ↓                       ↓
                    executeAiQuery      budget→policy→cache→   Workers AI fetch
                    (ai-service.ts)     rate-limit→chain→       OR Gemini embedContent
                            ↓           adapter→audit            (NO guards — F-01)
              injection*→budget→org-quota→policy→cache→RPM/TPM→chain→creds→adapter
                            ↓              ↓
                    adapter-registry.getAiAdapter / GeminiAdapterWrapper
                            ↓
              ┌─────────────┼──────────────────┐
              ↓             ↓                  ↓
  GeminiAdapterWrapper  OpenAiCompatibleAdapter (×3 registrations)
  executeGeminiAdapter  openai-compatible │ openrouter │ vercel-gateway
  GoogleGenAI SDK        fetch {base}/chat/completions
  [+Cloudflare GW proxy]  [+X-Title/throughput-routing | +monthly pool guard]
              ↓             ↓
        ai_request_logs ← budget.record ← recordKey*/recordModel*
        (ai-service/auditDraftStream)   (ai_credentials/ai:breaker:*)

  Side entries: workspace after()→reindex (F-01) · integrations probe→fetch (F-03) ·
                cron sweep→listings (F-04) · UI callAi/streamDraftArticle→E-01
```

`*` injection scan staff-gated; wrap non-staff only. Every generic node replaced with file:line in sections above.

---

# Function-Level Matrix

| Function | File | Caller | AI? | Provider | Model | Redis | DB | Retry | Fallback | Tokens | Tenant |
|---|---|---|---|---|---|---|---|---|---|---|---|
| handlePOST | app/api/dashboard/ai/route.ts:514 | HTTP POST | router | * | * | via deps | via deps | — | — | — | org body |
| handleDraftArticleStream | route.ts:248 | draft-article-stream | DIRECT stream | chain primary | chain models | budget/rate/breaker/cursor | policy/creds/cache/logs | 1/entry | next entry | success only | org |
| auditDraftStream | route.ts:190 | stream | log | — | — | — | ai_request_logs | — | — | logged | org col |
| serviceDeps | route.ts:100 | handlePOST | wiring | all adapters | — | budget+store+GW guard | db+cache | — | — | — | org cache scope |
| executeAiQuery | modules/ai/ai-service.ts:387 | runQuery/runTaskQuery | DIRECT | chain | policy/override+cascade | budget/quota/rate/cursor/breaker | policy/models/creds/logs/cache | ≤12 | next cred/model | est+actual | org |
| runQuery | modules/ai/ai-usage.ts:197 | task helpers | DIRECT | via service | via service | via service | via service | inherited | inherited | maxTokens/task | org |
| runTaskQuery | modules/ai/ai-task-query.ts:36 | verify/seo/polish/cover/tts/transcribe/assistant | DIRECT | via service | override passthrough | via service | via service | inherited | inherited | thinking/task | org |
| generateArticleDraft/suggestTags/summarizeReport/draftModerationReply/ocCoverCaption/ocVisionDraft/narrateInsights | ai-usage.ts:323-561 | route actions | DIRECT | via service | policy default | via service | via service | inherited | inherited | per-task caps | org |
| suggestTitles/Meta/Excerpt/Bundle | ai-seo.ts:270-353 | route | DIRECT | via service | policy default | via service | via service | inherited | inherited | 512-2048 | org |
| polishBody/classifyArticle | ai-polish.ts:39-126 | route | DIRECT | via service | policy default | via service | via service | inherited | inherited | per-task | org |
| generateCoverImage (COVER_MODEL gemini-3.1-flash-image) | ai-cover.ts:133 | route | DIRECT image | owner (gemini) | hardcoded override | via service | owner lookup | inherited | owner chain | — | org |
| synthesizeSpeech (TTS_MODEL gemini-3.8-flash-tts) | ai-tts.ts:100 | route | DIRECT audio | owner (gemini) | hardcoded override | via service | owner lookup | inherited | owner chain | — | org |
| transcribeAudio (TRANSCRIBE_MODEL gemini-3.5-transcribe) / transcribeToArticle (×3 calls) | ai-transcribe.ts:90-182 | route | DIRECT (×3) | owner (gemini) | hardcoded override | via service ×3 | via service ×3 | inherited ×3 | inherited ×3 | — | org |
| verifyPublisher | ai-verify.ts:110 | route | DIRECT | via service | policy default | via service | via service | inherited | inherited | 1024 | org |
| assistantChat | ai-assistant.ts:97 | route | DIRECT | via service | policy default | via service | via service | inherited | inherited | — | org |
| embedArticleChunks / embedQueryVector | ai-embeddings.ts:206/255 | route/workspace | DIRECT embed | workers-ai→gemini | bge-base / gemini-embedding-2 | NONE (F-01) | key lookup only | transport 1 retry | auto once | NONE (F-01) | org select |
| reindexArticleEmbeddings | ai-embeddings.ts:298 | route/workspace after() | DIRECT embed+write | via above | via above | NONE (F-01) | articles+embeddings | none | none | NONE | org scoped |
| getAiAdapter / GeminiAdapterWrapper | integrations/ai/adapter-registry.ts:16-47 | service/route | DIRECT dispatch | gemini/openai-compat/openrouter/vercel-gateway | passthrough | — (GW budget in route wrapper) | — | none | none | passthrough | — |
| executeGeminiAdapter / executeGeminiStream | integrations/ai/gemini-adapter.ts:283/192 | wrapper/route | DIRECT call | Google Gemini | passthrough | — | — | none | none | usage→out | — |
| OpenAiCompatibleAdapter.execute/executeStream | integrations/ai/openai-compatible-adapter.ts:363+ | registry/route | DIRECT call | openai-compat/openrouter/vercel-gw | passthrough | — | — | none | none | usage→out | — |
| embedTexts / embedTextsViaWorkersAi | integrations/ai/embeddings.ts:158 / workers-ai-embedding.ts:89 | ai-embeddings | DIRECT call | gemini / workers-ai | embed models | — | — | 1 retry | none | none | — |
| checkAiBudgetSafeguard/recordAiTokenUsage | modules/ai/ai-security.ts:188-227 | service/stream | guard | — | — | ai:budget:* | — | — | fail-open | counted | — |
| checkAiModelRateLimit/getAiModelLimits/estimateAiInputTokens | modules/ai/ai-rate-limit.ts:139-253 | service/stream | guard | — | per model | ai:limit:* | ai_models | — | fail-open | est charged | — |
| checkOrganizationQuota/getOrganizationQuotaLimits | ai-rate-limit.ts:339-418 | service only (F-02) | guard | — | — | ai:quota:org:* | organizations | — | fail-open | est charged | org |
| checkVercelGatewayBudget/record | integrations/ai/gateway/vercel/vercel-gateway.ts | route wrapper | guard | vercel-gateway | — | ai:vercel-gateway:* | — | — | fail-open | counted | pool scope |
| getActiveRoutingPolicy/getAvailableCredentials/selectCredential/classifyAiError/recordKey*/recordModel*/chain/cascade/breaker fns | modules/ai/ai-router.ts | service/stream/embed(key only) | control | generic | generic | cursor/breaker | policies/models/creds | policy | chain | — | org cred scope |
| scanPromptForInjection/wrapUntrustedUserInput/redactSecrets/scrubDraftPII | ai-security.ts:83-172 | service | guard | — | — | — | — | — | — | — | — |
| createAiSemanticCache lookup/store | ai-semantic-cache.ts:99-147 | service/stream | cache | — | per model hash | — | ai_semantic_cache | — | — | — | org isolated |
| testCredential | modules/integrations/ai-service.ts:207 | integrations route | DIRECT probe (F-03) | gemini or openai-compat* | probeModelFor | NONE | creds+policy | none | none | ping spend | actor org |
| liveIds/fetchJson (sweep) | app/api/internal/maintenance/ai-model-sweep/route.ts:17-98 | cron | listing (F-04) | gemini/openrouter/vercel-gw | — | — | catalog/audit | none | skip-on-fail | — | — |
| buildChainHealth | modules/ai/ai-chain-health.ts:25 | admin panel | read-only | — | — | consumes map | — | — | — | — | — |
| diffCatalogModels/findDanglingPolicyModels | modules/ai/ai-model-sweep.ts | sweep route | read-only | generic | generic | — | snapshots in | — | — | — | — |

---

# Entry-Point Matrix

| Entry Point | Trigger | Auth | Tenant | AI Function | Provider | Model | Sync/Async | Streaming | Persistence |
|---|---|---|---|---|---|---|---|---|---|
| POST /api/dashboard/ai (19 non-stream actions) | dashboard user gesture | session+org membership, CSRF | org body | executeAiQuery | chain | policy/override | sync JSON | no | ai_request_logs + creds + cache |
| POST /api/dashboard/ai draft-article-stream | draft button | same | org body | handleDraftArticleStream | primary chain | chain models | SSE (async run) | yes | ai_request_logs (no blocked/cache-hit rows — F-02) |
| POST /api/dashboard/ai semantic-search/embeddings-reindex | search/reindex button | same | org body | embed*/reindex | workers-ai→gemini | embed models | sync | no | document_embeddings only (F-01) |
| POST /api/dashboard/workspace | article.create/update | session/key+org, CSRF | org body/saved | reindexArticleEmbeddings via after() | workers-ai→gemini | embed models | background after() | no | document_embeddings only (F-01) |
| POST /api/dashboard/integrations ai.credential.test | admin test click | platform AI grant | actor org | testCredential fetch | gemini or baseUrl map | probe/default | sync | no | credential counters only (F-03) |
| GET /api/internal/maintenance/ai-model-sweep | cron `15 3 * * *` | cron secret | none | liveIds listings | gemini/openrouter/vercel-gw | — | sync | no | ai_models + audit log (F-04) |
| UI callAi / streamDraftArticle + 15 components | user gesture | inherited session | org arg | → E-01 | — | — | fetch | both | inherited |

---

# Provider Graph

```text
POST /api/dashboard/ai (+ workspace/integrations/cron entries)
    ↓
AiServiceDeps / executeAiQuery  (+ stream-local chain, + unguarded embed path)
    ↓
getAiAdapter / GeminiAdapterWrapper (+ Cloudflare GW proxy for gemini when slug set)
    ├── gemini (PRIMARY — GoogleGenAI SDK) [CONFIGURABLE via policy; seed primary]
    │      ├── gemini-2.5-flash (seed default; PRIMARY model)
    │      ├── gemini-3.6-flash (is_default workhorse)
    │      ├── gemini-2.5-pro (restrictive RPM 2 — FALLBACK-leaning)
    │      ├── gemini-3.1-flash-lite (extraction)
    │      ├── gemini-3.7-flash (heavy)
    │      ├── deep-research-preview (no cascade)
    │      ├── gemini-3.8-flash-tts / gemini-3.5-transcribe / gemini-3.1-flash-image (HARDCODED overrides)
    │      └── gemini-embedding-2 (EMBEDDING FALLBACK)
    ├── openrouter (FALLBACK-capable — fetch; active only after operator sets primary + credential)
    │      ├── openai/gpt-4o-mini
    │      └── anthropic/claude-3.5-haiku
    ├── vercel-gateway (FALLBACK pool — fetch + monthly Redis pool; no seeded models)
    │      └── (operator-added models)
    ├── openai-compatible (DISABLED-by-default — registered, no seed provider row; reachable if operator inserts row+credential)
    └── workers-ai (EMBEDDING PRIMARY — fetch; free-tier neurons)
           └── @cf/baai/bge-base-en-v1.5 (ENV-overridable)
```

No EMERGENCY FALLBACK tier exists; exhaustion returns a busy message. All non-gemini chat providers require operator-added credentials or the router skips them (OBSERVED IN CODE: entries without credentials are skipped — `ai-service.ts:663-666`).

---

# Bypass Paths

```text
ID: BP-1
Severity: P0 (see F-01)
File: src/modules/ai/ai-embeddings.ts
Function: embedArticleChunks (:206), embedQueryVector (:255), reindexArticleEmbeddings (:298)
Evidence: zero imports of budget/rate-limit/quota/breaker/log helpers; only resolveApiKey (key lookup) + transports.
Actual Flow: route/workspace → embed → Workers AI/Gemini fetch → document_embeddings; no ai:budget/ai:quota/ai:limit/ai:breaker touch, no ai_request_logs.
Impact: unmetered, unlogged provider spend; org quotas unenforceable on embeddings; no per-tenant attribution.
```

```text
ID: BP-2
Severity: P1 (see F-03)
File: src/modules/integrations/ai-service.ts
Function: testCredential (:207-266)
Evidence: direct fetch() :229-239; no guard imports on that path.
Actual Flow: admin click → decrypt → fetch :generateContent ( Gemini ping 'Ping. Balas dengan OK.') or GET {base}/models → counters only.
Impact: real token/quota spend outside budget/quota/logs; low frequency (manual admin click), credential-scoped.
```

```text
ID: BP-3
Severity: P2 (see F-04)
File: src/app/api/internal/maintenance/ai-model-sweep/route.ts
Function: liveIds (:75-98), decryptFirst (:61-73)
Evidence: Gemini listing key passed as URL query ?key= (:84); fetchJson no redaction.
Actual Flow: cron → decrypt → GET .../v1beta/models?key=SECRET → catalog diff.
Impact: key in URL (logs/proxies), listing-only (no token spend), cron-scoped.
```

```text
ID: BP-4
Severity: P1 (see F-02)
File: src/app/api/dashboard/ai/route.ts
Function: handleDraftArticleStream (:248-512)
Evidence: no checkOrganizationQuota import/call; no scanPromptForInjection/wrapUntrustedUserInput;
  guard blocks (260-267,319-321) return without auditDraftStream; cache-hit shortcut (291-312) returns without audit row;
  no acquireAiGlobalSlot; rate limit first-chain-model only (:315); first credential only (:280-286).
Actual Flow: stream → budget → policy → cache → first-model rate limit → per-entry single attempts → audit success/fail only.
Impact: org quota unenforceable on the flagship draft UX; blocked/cache-hit streams invisible in ai_request_logs;
  unbounded per-instance stream concurrency; weaker credential rotation.
```

---

# Duplicate AI Invocation Analysis

```text
ID: D-1 — transcribe-to-article ×3 (P2)
Single request → 3 sequential executeAiQuery (transcribe :147 + draft :154 + classify :169 — ai-transcribe.ts:141-182).
Worst-case provider calls/request: 3 × 12 = 36. Each leg independently charges org-quota estimate + budget on success.
No shared attempt budget across legs. INFERRED FROM CALL GRAPH (legs observed, caps STATIC).
```

```text
ID: D-2 — stream + non-stream double invocation (P3)
ai-draft-assist prefers stream (use-ai-stream) with non-stream fallback (ai-draft-assist.tsx:49,88).
A stream failure/timeout followed by user retry or auto-fallback issues a second full generation for one intent.
No idempotency key links the two attempts. INFERRED FROM CALL GRAPH.
```

```text
ID: D-3 — save + manual reindex (P3)
article.create/update auto-reindexes via after() AND the operator can invoke embeddings-reindex for the same article.
Two reindexes = 2 × (≤20 chunks embed + INSERT + DELETE). No content-hash skip. OBSERVED IN CODE (both paths call
reindexArticleEmbeddings unconditionally).
```

```text
ID: D-4 — seo-bundle vs singles (INFO)
seo-bundle = 1 call for 3 outputs (ai-seo.ts:336); three single calls = 3 calls. Client chooses; no enforcement.
Efficient path exists and is documented. OBSERVED IN CODE.
```

```text
ID: D-5 — fallback-after-partial-stream (CONTROLLED, INFO)
Code explicitly prevents it: sentAny flag stops fallback after partial output (route.ts:455-460) and abort paths
return without further attempts (:431-451). Single-request provider calls stay ≤ chain length. OBSERVED IN CODE.
```

---

# AI Load Amplification

STATIC bounds (from code constants; no live measurement):

| Entry action | AI calls/req (normal) | Max provider calls/req | Redis ops/req | DB ops/req |
|---|---|---|---|---|
| 19 non-stream singles | 1 executeAiQuery | ≤12 attempts (AI_MAX_TOTAL_ATTEMPTS) across ≤4 chain entries | budget 6 + quota ≤6 + rate 1 + cursor 0-1 + breaker ≤4 reads + fail writes | policy 1 + quota-limits 1 + model-limits 1 + cascade ≤1 + creds ≤entries + key/log ≤attempts + cache ≤3 |
| draft-article-stream | 1 stream | ≤ chain length (≤4), 1 attempt/entry | budget 2 + rate ≤3 + breaker ≤chain + cursor 0-1 (NO quota — F-02) | policy 1 + creds ≤entries + logs ≤entries + cache ≤chain |
| transcribe-to-article | 3 executeAiQuery | ≤36 | 3× single | 3× single |
| semantic-search | 1 embed (query) | Workers ≤2 HTTP + Gemini ≤2 HTTP (1 text) | 0 (F-01) | key lookup ≤2 + candidates 1 (+ILIKE 0-1) |
| embeddings-reindex / auto-reindex | 1 embed (≤20 chunks) | Workers ≤2 HTTP + Gemini ≤40 HTTP | 0 (F-01) | article 1 + key lookup 1 + insert 1 + delete 1 |
| credential probe | 1 fetch | 1 | 0 | creds+policy+counters |
| model sweep | 0 generative (≤3 listings) | ≤3 listing HTTP | 0 | catalog reads + deactivations |

MODELLED projection (worst-case simultaneous, all fail-over-exhausted; assumes seeded Gemini chain of 4):

```text
1 user draft request      → ≤12 provider calls
10 users                  → ≤120
100 users                 → ≤1,200
1,000 users               → ≤12,000 (+ Redis ≈ 15k-20k cmds, DB ≈ 30k+ queries)
10,000 users              → ≤120,000 (global budget 250k tokens/day + 60 req/hour would block first —
                                     budget is the only global backstop; per-model RPM 2-30/min throttles Gemini)
1 transcribe-to-article   → ≤36 provider calls (≈3× draft)
1 reindex (20 chunks)     → ≤42 embedding HTTP calls, zero guardrails (F-01)
```

Heaviest path: `transcribe-to-article` (most provider calls + 3× quota pre-charge). Weakest controls: embedding reindex/search (no controls at all).

---

# Security Review

- Prompt injection: 17-pattern scan + 1500ch cap for non-staff (`ai-security.ts:83-104`), boundary wrap (`:112-120`), staff bypass by design (dashboard roles are staff; public channel keeps the scan). Stream lacks both (BP-4) but serves the same staff population — risk contained, parity still required (F-02).
- Tenant isolation: credentials `(org IS NULL OR =org)` + active-only (`ai-router.ts:784-791`); semantic cache same pattern + never other-tenant rows (`ai-semantic-cache.ts:112-113`); embeddings article+vectors strictly `organization_id=` (`ai-embeddings.ts:304-305`, `route.ts:577,605`); logs carry `organization_id`. OBSERVED IN CODE — HEALTHY.
- Authorization: dashboard session + org membership + CSRF on all AI POSTs; cron secret on sweep; platform grant on credential admin. Non-disclosing denials. HEALTHY.
- SSRF/tool execution: no server-side URL fetch on AI paths; `enableTools:false` on all dashboard queries; Gemini tool loop exists (`MAX_TOOL_TURNS=3`) but unreachable from dashboard (no toolExecutor passed — `GeminiAdapterWrapper.execute` passes `undefined`, `adapter-registry.ts:21-23`). No SSRF vector found.
- Secret leakage: DB-envelope encryption (`ai-crypto.ts`), masked display, `redactSecrets` on all outputs/deltas/cache-serves, secret-pattern input reject (`ai-usage.ts:53-59`), key redaction in error paths (`gemini-adapter.ts:44-54`, `openai-compatible-adapter.ts:208-228`). EXCEPT sweep `?key=` URL (F-04).
- Provider response trust: vectors validated finite + dim-capped; JSON parsed inside try + sliced; image/audio MIME-allowlisted + byte-capped. HEALTHY.

---

# Findings

```text
ID: F-01
Severity: P0
File: src/modules/ai/ai-embeddings.ts
Function: embedArticleChunks (:206), embedQueryVector (:255), reindexArticleEmbeddings (:298)
Evidence: imports are embedTexts/embedTextsViaWorkersAi/resolveApiKey only; no budget/rate/quota/breaker/log/usage call on the
  path; route branches (563-628) and workspace after() (137-152) add no guards around them.
Actual Flow: USER(button/save) → route/workspace → embed → provider fetch → document_embeddings. Guards: none.
Impact: unmetered + unlogged provider spend (Workers AI neurons + Gemini quota), org quotas bypassable at scale
  (20-chunk reindex per save), zero tenant usage attribution, failures invisible.
```

```text
ID: F-02
Severity: P1
File: src/app/api/dashboard/ai/route.ts
Function: handleDraftArticleStream (:248-512)
Evidence: no checkOrganizationQuota call; no scanPromptForInjection/wrap import; guard blocks :260-267,:319-321 and
  cache-hit :291-312 return without auditDraftStream; no acquireAiGlobalSlot; :315 rates first model only; :280-286 takes credentials[0].
Actual Flow: stream → budget → policy → cache → first-model rate limit → single attempts/entry → success/fail audit only.
Impact: org quota bypass on flagship UX; blocked + cache-hit streams unobserved; unbounded stream concurrency;
  single-credential rotation.
```

```text
ID: F-03
Severity: P1
File: src/modules/integrations/ai-service.ts
Function: testCredential (:207-266)
Evidence: direct fetch :229-239 with decrypted key; outcome only to credential counters.
Actual Flow: admin click → decrypt → provider ping/listings → recordCredentialTest. No budget/quota/rate/breaker/ai_request_logs.
Impact: real spend outside all controls; manual low-frequency; admin-scoped. (Out of F-01/F-02 remediation scope; listed, not fixed here.)
```

```text
ID: F-04
Severity: P2
File: src/app/api/internal/maintenance/ai-model-sweep/route.ts
Function: liveIds (:75-98)
Evidence: :84 interpolates decrypted Gemini key into ?key= URL query.
Actual Flow: cron → decrypt → GET .../models?key=SECRET → diff → deactivate.
Impact: key exposure to logs/proxies; listing-only, no token spend. (Out of scope; listed.)
```

```text
ID: F-05
Severity: P2
File: src/modules/ai/ai-transcribe.ts
Function: transcribeToArticle (:141-182)
Evidence: three sequential runTaskQuery calls (:147,:154,:169), each a full guarded pipeline with independent retry budgets.
Actual Flow: 1 request → 3 × (guards + ≤12 attempts). See D-1.
Impact: worst-case 36 provider calls per click; triple quota pre-charge per request. (D-track; not fixed in F-01/F-02 scope.)
```

```text
ID: F-06
Severity: P3
File: src/integrations/ai/ai-budget.ts
Function: checkAiBudgetSafeguard / recordAiTokenUsage (:39-77)
Evidence: duplicate of ai-security.ts guard with GLOBAL keys ai:budget:* (no namespace).
Actual Flow: present but superseded; route/serviceDeps wires the namespaced guard.
Impact: if ever wired, staging/prod budgets merge; dead-code confusion today. Recommend removal in a later pass.
```

```text
ID: F-07
Severity: INFO
File(s): various
Function(s): ROUTING_UNCONFIGURED (ai-service.ts:510-522); rpd_limit (schema only); costMode price (routing hint only);
  vercel-gateway adapter registration without credential (adapter-registry.ts:33); research-model cascade exclusion (ai-router.ts:474-482)
Evidence: as cited.
Actual Flow: documented behaviors, no user impact beyond observability gaps already covered by F-01/F-02.
Impact: none immediate; noted for completeness.
```

---

# Critical Paths

1. **Where can AI be called?** `POST /api/dashboard/ai` (22 actions), `POST /api/dashboard/workspace` (auto-reindex), `POST /api/dashboard/integrations` (probe), cron sweep (listings), UI components (via E-01). — §Entry Points.
2. **Who calls it?** Dashboard members (session+org), access-key actors (workspace), cron (secret), platform admins (probe). — §Entry Points.
3. **Which internal function?** `executeAiQuery` (19 actions), `handleDraftArticleStream` (stream), `embed*/reindex*` (embeddings), `testCredential` (probe). — §Call Graphs.
4. **Which provider?** DB-driven: `gemini` default; `openrouter`/`vercel-gateway` after operator config; `workers-ai` for embeddings. — §Provider Graph.
5. **Which model?** `ai_routing_policies.default/fallback_model` + cascade; 3 hardcoded modality overrides; embed models per §Model Inventory.
6. **How is the model selected?** DATABASE (policy+catalog), HARDCODED (3 modality models), ENV (Workers AI default), never client-selected. — §Model Inventory.
7. **What happens before the provider call?** injection*→budget→org-quota→policy→cache→RPM/TPM→chain→credentials→slot (*staff-gated). Stream skips org-quota; embeddings skip everything. — §Call Graphs.
8. **What Redis operations?** budget 6, quota ≤6, rate 1, cursor 1, breaker ≤4+fail-writes, gateway 1-3 — all `{ns}:ai:*`, fail-open. — §Redis AI Flow.
9. **What DB operations?** policy 1, quota-limits 1, model-limits 1, cascade ≤1, creds ≤entries, key/log per attempt, cache ≤3. — §Load Amplification table.
10. **How are retries handled?** Per-key (≤5) + per-entry budget + ≤12 total + deadline + backoff+jitter; stream 1/entry; embeddings transport-level 1 retry. — §Retry.
11. **How are fallbacks handled?** Next credential → next chain entry (≤4, cascade-capped); breaker-tripped skipped; stream next-entry only pre-partial; embeddings Workers AI→Gemini once. — §Retry.
12. **How are quotas enforced?** Global budget → org daily → model RPM/TPM → gateway pool, all Redis, all fail-open, pre-charge on allow. — §Rate Limit.
13. **How are tokens measured?** Provider-reported usage on success; chars/4 estimate pre-call; embeddings unmeasured. — §Token Flow.
14. **Where is usage persisted?** `ai_request_logs` (per-request), `ai_credentials` counters, `SUM(total_tokens)` aggregates; embeddings nowhere (F-01). — §Persistence.
15. **Can any AI call bypass central controls?** YES — 4 paths (BP-1..BP-4). — §Bypass Paths.
16. **Can one request trigger multiple AI calls?** YES — up to 36 (D-1), ≤12 normal, ≤4 stream, ≤42 embedding HTTP. — §Duplicate + §Amplification.
17. **Worst-case amplification?** 36 provider calls/request (transcribe-to-article); 120k per 10k users on drafts (MODELLED). — §Amplification.
18. **Most expensive path?** `transcribe-to-article` (calls × tokens: audio + 2048 draft + classify). — §Amplification.
19. **Weakest controls?** Embeddings (none) → stream (partial) → probe (none, admin-scoped). — §Findings.
20. **Centralized or apparently centralized?** PARTIALLY CENTRALIZED — generation is centralized; embeddings/probe/listings/stream-variant are not. — §Verdict.

---

# Recommendations

1. **P0 — F-01:** put embeddings behind the shared budget/quota/rate-limit/breaker/logging boundary (no new tables; `ai_request_logs` channel/status already allow it). — remediated in `AI_REMEDIATION_REPORT.md`.
2. **P1 — F-02:** restore stream parity: org-quota gate, blocked + cache-hit audit rows, concurrency slot. — remediated in `AI_REMEDIATION_REPORT.md`.
3. **P1 — F-03 (later):** route the credential probe through `executeAiQuery`-adjacent guards or a dedicated probe budget (e.g. hourly per-credential cap) + `ai_request_logs` row; never blocks on scope creep now.
4. **P2 — F-04 (later):** send the Gemini listing key via `x-goog-api-key` header instead of `?key=`.
5. **P2 — F-05/D-1 (later):** shared attempt/quota envelope for `transcribeToArticle` legs.
6. **P3 — F-06 (later):** delete `integrations/ai/ai-budget.ts` or re-export the namespaced guard.
7. Enforce `rpd_limit` or drop the column; add monetary math if `costMode: price` is ever more than a routing hint.

---

# Final Verdict

```text
HEALTHY: tenant isolation, auth, secret handling, response validation, stream partial-output semantics (D-5)
COMPLEX-BUT-CONTROLLED: non-stream generation pipeline (all guards, fail-open, observed)
DUPLICATED: stream pipeline (re-implements chain logic, weaker guards — F-02)
BYPASS: embeddings (F-01), credential probe (F-03), sweep key transport (F-04)
UNOBSERVED: embedding usage/failures, stream blocks/cache-hits, unconfigured routing
RISK: worst-case 36× amplification on transcribe-to-article (F-05/D-1)

Subsystem: PARTIALLY CENTRALIZED
```

```text
FILES CHANGED: 1 (AI_CALL_FLOW_AUDIT.md)
SOURCE FILES CHANGED: NO
TESTS RUN: 0
PRODUCTION TOUCHED: NO
SECRETS READ: NO
AI PROVIDERS CALLED: NO
AI TOKENS CONSUMED: NO

AI ENTRY POINTS: 7 (1 route×22 actions + workspace + probe + sweep + 15 UI callers funnelled)
AI DIRECT PROVIDER CALLS: 6
AI PROVIDERS: gemini, openai-compatible, openrouter, vercel-gateway, workers-ai (+ Cloudflare GW proxy)
AI MODELS: gemini-2.5-flash, gemini-3.6-flash, gemini-3.7-flash, gemini-2.5-pro, gemini-3.1-flash-lite, deep-research-preview, gemini-embedding-2, gemini-3.8-flash-tts, gemini-3.5-transcribe, gemini-3.1-flash-image, @cf/baai/bge-base-en-v1.5, openai/gpt-4o-mini, anthropic/claude-3.5-haiku
AI BYPASS PATHS: 4 (BP-1 P0, BP-2 P1, BP-3 P2, BP-4 P1)
DUPLICATE INVOCATION RISKS: 5 (D-1 P2, D-2 P3, D-3 P3, D-4 INFO, D-5 controlled)
CRITICAL FINDINGS: 2 (F-01 P0, F-02 P1) + 5 tracked (F-03..F-07)

FINAL VERDICT: PARTIALLY CENTRALIZED
```
