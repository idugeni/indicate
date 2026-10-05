# AI CALL FLOW AUDIT — INDICATE

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

## ai-task-query.ts / ai-task-profiles.ts / ai-usage.ts et al.

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
- Prompt templates: static strings + `PROMPT_REGISTRY v1` (`prompt-registry.ts:33-58`, `seo-bundle/polis
...[truncated 20887 chars]