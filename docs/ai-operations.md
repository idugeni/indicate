# AI Operations Runbook

Covers key rotation, the credential pool, routing policy, budget guards, log
triage, and the dashboard AI Control Plane view. All provider keys live
in Postgres; no `GEMINI_*` / `AI_CREDENTIALS_*` environment variable exists
by design (`bootstrap-schema.ts` rejects unknown `AI_*` keys in production).

## Components

| Area | Location |
|---|---|
| Schema (7 tables + 2 enums) | `src/data/schema/ai.ts`, `ai-cache.ts`, `ai-embeddings.ts` |
| Router, service, guardrails | `src/modules/ai/` (`ai-router.ts`, `ai-service.ts`, `ai-security.ts`, `ai-crypto.ts`) |
| Provider adapter (Gemini) | `src/integrations/ai/gemini-adapter.ts` (only `@google/genai` import) |
| Provider adapter (OpenRouter) | `openrouter` in `src/integrations/ai/adapter-registry.ts` (OpenAI-compatible, `https://openrouter.ai/api/v1`) |
| Provider adapter (Vercel Gateway) | `vercel-gateway` in `src/integrations/ai/adapter-registry.ts` (OpenAI-compatible, `https://ai-gateway.vercel.sh/v1`) |
| Gateway transports | `src/integrations/ai/gateway/` (`cloudflare/`, `workers-ai/`, `vercel/` — one folder per gateway) |
| Budget guard (Redis) | `src/integrations/ai/ai-budget.ts` (250k tokens/day, 60 req/hour, fail-open) |
| Dashboard repo + commands | `src/data/repos/ai.ts`, `src/modules/integrations/ai-service.ts` |
| Dashboard view | View `ai` in `view-registry.ts`, `ai-management-panel.tsx` |
| Usage endpoints | `POST /api/dashboard/ai` (editorial, taxonomy, moderation, media, analytics) |

## First-time setup (owner, manual)

1. Apply migrations 222-227 with `DATABASE_DIRECT_URL` per `docs/migrations.md`,
   then verify `GET /api/health`.
2. Provision the master secret once: dashboard Asisten AI → Master Secret →
   Provision (superadmin, `platform.ai.manage`). The plaintext is never
   returned; only version + fingerprint are shown. Rotate with expected version.
3. Grant `platform.ai.manage` to platform roles through the role-permission flow.
4. Add the first provider key in the panel (provider + label + secret + priority),
   then use Test to validate before marking active. Test pings Gemini over
   `generativelanguage` and OpenAI-compatible providers (`openrouter`,
   `vercel-gateway`, `openai-compatible`) over their own `/chat/completions`.
5. Apply migration 237 (`ai_free_tier_gateways`) for the `workers-ai` and
   `vercel-gateway` provider rows, then add their keys in the same panel.
   Set `vercel-gateway` as fallback provider to carry non-critical
   editorial load on the monthly free tier.
6. Apply migration 247 (`ai_openrouter_provider`) for the `openrouter`
   provider and its starter models, add the `sk-or-...` key in the same
   panel, then set `openrouter` as primary provider with an OpenRouter
   model id (for example `openai/gpt-4o-mini`). Keep a Gemini key as
   fallback for TTS, transcription, and cover-image modalities.

## Free-tier gateways

- Cloudflare AI Gateway (optional, transport only): set
  `CLOUDFLARE_AI_GATEWAY_SLUG` to route Gemini chat/stream through
  `google-ai-studio` with a `cf-aig-cache-ttl` header (default 24h).
  Repeated editorial prompts then hit cache instead of Gemini quota.
  Provider auth stays BYOK from `ai_credentials`; unset keeps direct.
- Workers AI embeddings (automatic with fallback): reindex and
  semantic-search embed via `@cf/baai/bge-base-en-v1.5` first (free
  Neurons allocation), then Gemini when Workers returns all-null.
  Override the model with `CLOUDFLARE_AI_EMBEDDING_MODEL`. Postgres
  `document_embeddings` stays the source of truth.
- Vercel AI Gateway (provider `vercel-gateway`): OpenAI-compatible
  endpoint for the monthly free-tier model subset. Spend is capped per
  organization+model at 500k tokens/month in Redis
  (`ai:vercel-gateway:tokens:*`, fail-open); the gateway itself returns
  `429`/`403` past the free tier and the router cools the key down.

## Rotation and cooldown

- Default strategy is `health_aware`: lowest error rate first, automatic
  `cooldown` on 429/quota/invalid with auto-recovery after `cooldown_until`.
- Manual cooldown: credential row → Cooldown (5 minutes). Disable removes a key
  from rotation without deleting telemetry.
- `recordKeyFailure` marks `invalid` keys permanently; re-test after fixing
  the key at the provider, then re-enable.
- Model failover: routing policy holds `primary_provider_id`, `default_model`,
  plus `fallback_provider` and `fallback_model`. When every key for the
  primary is exhausted, the service retries the chain on the fallback before
  giving up; an empty fallback provider means the fallback model runs on the
  primary provider. All four are editable in the panel; the active chain is
  shown underneath the form. Draft streaming stays on the primary provider:
  Gemini entries stream token deltas, OpenAI-compatible entries
  (`openrouter`, `vercel-gateway`) resolve one non-streaming turn and emit
  it as a single SSE delta before `done`, so the client contract is unchanged.
- Chain strategy (`chain_strategy`, `fallback` default): `fallback` tries the
  chain in fixed order and moves to the next entry on retryable failure;
  `round_robin` rotates the starting entry per request through the Redis
  cursor `ai:chain:cursor` (fail-open to fixed order) to spread load, with
  failover to the next entry preserved. A single-entry chain (one provider,
  no fallback) is unaffected by either strategy. `rotation_strategy`
  (`health_aware` default) is orthogonal: it picks the credential *within*
  one provider, while the chain strategy orders *models* across entries.
- Modality overrides follow the catalog owner: TTS, transcription, and
  cover-image models run on their owning provider (`gemini`, seeded by
  migration 249), never blindly on the primary — so editorial chat can move
  to `openrouter` while voice and vision stay on Gemini keys.
- Provider transports: Gemini pings `generativelanguage` with a catalog model
  owned by the tested provider; OpenAI-compatible probes (`openrouter`,
  `vercel-gateway`, `openai-compatible`) use `GET /models` so the result
  never depends on the configured default model. OpenRouter calls carry an
  `X-Title: Indicate` header.
- Policy validation: saving rejects unknown provider ids and a default or
  fallback model whose catalog owner differs from the selected provider.
  Model names outside the catalog are allowed (the catalog may lag new
  provider models). Editable numeric guards are `max_retries` (1–10),
  `per_key_retry_limit` (1–5), `cooldown_duration_sec` (10–3600),
  `request_timeout_ms` (1s–300s), and `global_concurrency_limit` (1–1000).
- Chain preview warns when a chain entry has no active credential, so a
  miswired fallback is visible before the first failed request. New
  providers are registered through seed migrations; the panel lists them
  read-only with active and chat-capability flags (`supports_chat` —
  `workers-ai` is embedding-only and is rejected as primary/fallback).
- `per_key_retry_limit` (1–5) caps how many times one key is tried per query,
  across both chain entries; `max_retries` caps attempts per chain entry.
- Retries use exponential backoff with full jitter (500ms base, 3s cap)
  between key attempts, per the provider's retry guidance for 429/5xx.
- Model circuit breaker: 5 consecutive infra failures (`provider_unavailable`,
  `timeout`, `rate_limit`, `quota_exhausted`) trip one model for 120s in Redis
  (`ai:breaker:{provider}:{model}`); tripped models are skipped unless every
  entry is tripped (half-open). Success decays the counter. Redis down means
  fail-open, like every other guard here.
- `request_timeout_ms` (1s–300s, default 60s) bounds every provider call and
  every draft stream; a timeout classifies as retryable and moves the chain.
- Empty text without media is retried as `malformed_response` instead of
  reaching callers; the non-stream adapter no longer masks it with a
  placeholder sentence.

## Per-model rate limits

`ai_models` carries `rpm_limit`/`tpm_limit`/`rpd_limit` per model. Enforcement
is a 60-second Redis sliding window (`ai:limit:{model}:{window}`) checked after
the semantic-cache hit and before the provider call. Blocked calls return the
busy message, are logged as `blocked`, and never consume a key. Models without
a registered limit are unlimited. Every Redis failure is fail-open.

## Budgets and org attribution

Redis keys `ai:budget:tokens:DAY` (48h TTL) and `ai:budget:reqs:HOUR` (2h TTL).
Exceeding either returns the quota-exhausted message without calling providers.
Counters are fail-open: Redis down means requests proceed and are logged.

`ai_request_logs.organization_id` attributes each call to its organization
(`NULL` = pre-attribution global calls). The panel's Token per Organization
table aggregates requests, tokens, and blocked calls over 7/30 days.

## Reading the logs

- `ai_request_logs` is append-only (`success|failed|blocked`): channel, model,
  credential (masked), latency, tokens, tools. Filter by status in the panel.
- `ai_query_insights` collects editor-flagged queries (`open`) for content-gap
  triage; Resolve marks them handled. Nothing with reporter contact is stored.
- `ai_semantic_cache` hits show as `provider_id = semantic-cache` with ~12ms
  latency; a rising miss rate means prompts are too unique or TTL too short.

## Egress notes

Panel reads are projected + limited (credentials 8/page server-side 200 cap,
logs 10/page server-side 50 cap, analytics sample 1000). Cache hit costs
1 read + 1 hits write; reindex costs ≤22 rows per article. Gateway cache
hits cost no provider call at all; the Vercel monthly budget adds 1 Redis
read per `vercel-gateway` call plus 1 write on success. See `AGENTS.md`
Database access and egress before adding new AI reads.
