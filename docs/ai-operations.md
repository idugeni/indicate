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
4. Add the first provider key in the panel (label + secret + priority),
   then use Test to validate before marking active.

## Rotation and cooldown

- Default strategy is `health_aware`: lowest error rate first, automatic
  `cooldown` on 429/quota/invalid with auto-recovery after `cooldown_until`.
- Manual cooldown: credential row → Cooldown (5 minutes). Disable removes a key
  from rotation without deleting telemetry.
- `recordKeyFailure` marks `invalid` keys permanently; re-test after fixing
  the key at the provider, then re-enable.
- Model failover: routing policy holds `default_model` plus `fallback_provider`
  and `fallback_model`. When every key for the primary is exhausted, the service
  retries the chain on the fallback before giving up. Both are editable in the
  panel; the active chain is shown underneath the form.

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
1 read + 1 hits write; reindex costs ≤22 rows per article. See `AGENTS.md`
Database access and egress before adding new AI reads.
