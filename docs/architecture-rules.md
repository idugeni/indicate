# Architecture Rules

Runbook for contributors. Companion to `docs/ARCHITECTURE.md` (still the source of truth for topology and invariants). These rules encode the performance and caching decisions applied in the current tree.

## 1. Data projection rule: listings never load `body` or `gallery`

Listing, search, category, tag, and existence checks must use `ArticleListItem` (`src/modules/delivery/models.ts:38`). Full content (`body` + `gallery`) belongs only to `NetworkArticle` (`src/modules/delivery/models.ts:75`), loaded on the single-article detail path and the RSS feed.

Forbidden on listing paths:

- selecting `articles.body`;
- joining the `media` gallery per article;
- calling `NetworkContentService.load()` with an `articleSlug` only to test existence.

Use `NetworkContentService.resolveArticleId()` instead. It runs one indexed lookup (`SELECT articles.id ... LIMIT 1` with `published/active/publishedAt` predicates, `src/data/repos/delivery.ts:204`) inside the public tenant context. Reference implementation: `POST /api/network/reports` (`src/app/api/network/reports/route.ts:55`) resolves the reported slug to an id without touching body or gallery.

Budget enforced by `scripts/perf/listing-payload.mjs`: 100 lean items must stay under 150 KB (`BUDGET_BYTES = 150 * 1024`). Measured locally: full projection ~208 KB vs lean ~61 KB (~70% saving). CI (`npm run perf`, job `perf` in `.github/workflows/quality-gate.yml`) fails the build on breach (exit 1).

## 2. Design trade-off: `readingMinutes` is an estimate from the excerpt

`readingMinutes()` (`src/modules/site/components/network/templates/warm-editorial/lib/format.ts:66`) accepts `Pick<ArticleListItem, 'description'> & { body?: string }` and prefers `body` when present, otherwise falls back to `description`. Listing cards therefore display an estimate derived from the ~180-character excerpt, not a full-body word count.

Consequences:

- Listing values under-read long articles by design; the detail page corrects the number once `body` is loaded.
- Do not "fix" this by loading `body` in listings. The payload and query cost outweigh the precision gain.
- Tests pin the contract (`format.test.ts:35-41`): empty text floors at 1 minute, rate is 200 words per minute.

## 3. Heavy server-side dependencies: lazy import + benchmark registration

Native or large server libraries (reference case: `sharp`) must follow the `seal-watermark` pattern:

1. No static `import ... from 'sharp'` and no `require('sharp')` outside the single owning module. Owning module loads via `await import('sharp')` at call time (`src/modules/billing/seal-watermark.ts:18`).
2. Callers gate usage to the narrow path that needs it. The seal route only invokes `watermarkStamp()` on `type === 'stamp'` (`src/app/api/dashboard/billing/invoice/[id]/seal/route.ts:71`); the `sign` path streams bytes untouched.
3. Keep the package in `serverExternalPackages` in `next.config.ts` so it never enters a client or edge bundle.
4. Register the invariant in `scripts/perf/seal-coldstart.mjs` (dynamic-import check, delegation check, stamp-only check, repo-wide static-import scan excluding the owner file). Any new heavy dependency must add an equivalent check to that script.

`npm run perf:seal-coldstart` exits 1 on any static import outside the owner module. The `perf` CI job runs it on every PR and `main` push.

## 4. Caching strategy: edge TTL in `proxy.ts` vs durable-intent revalidation

Two layers, two owners:

- **Fast path (edge).** `proxy.ts:275` sets `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300` on the tenant `/` rewrite to `/tenant-home`. Browsers always revalidate (`max-age=0`); the CDN serves stale up to 60 s and revalidates in background for up to 300 s. This absorbs homepage/listing bursts without hitting Postgres. Authenticated, preview, control-plane, and error responses stay `private, no-store` (see `route.ts:36`, seal route headers).
- **Freshness path (durable intent).** Mutations never purge synchronously. They write `invalidation_tasks` in the same Postgres transaction (`delivery.ts:364`), planned by `planInvalidation()` (`src/modules/delivery/invalidation.ts:13`) into tag set (`org:`, `site:`, `host:`, `article:`) plus path and URL lists. `InvalidationDispatcher.dispatch()` (`invalidation.ts:33`) claims tasks, purges exact Cloudflare URLs best-effort in one batch, then runs Next `revalidateTags` + `revalidatePaths`. Purge failure does not fail the task; the 60 s edge TTL self-heals. Poison tasks are counted via `failed`/`stranded`, never blocking the batch.

When adding a tenant-visible mutation: build a `NetworkMutation`, call `planInvalidation()`, persist via `createInvalidation()` in the committing transaction. Do not call `revalidateTag`/`revalidatePath` inline from the CMS route (exception: the marketing `site-content` tag with hourly TTL, invalidated directly in `src/app/api/dashboard/content/route.ts:139`).

## Verification

```sh
npm run typecheck
npm run perf
npx vitest run src/app/api/network/reports/route.test.ts src/modules/delivery/network-content-service.test.ts src/modules/delivery/invalidation.test.ts
```
