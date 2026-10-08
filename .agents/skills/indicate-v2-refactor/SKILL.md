# INDICATE V2 Refactor & Cost-Control Skill

## Purpose
Use this skill for every substantial INDICATE refactor, especially Dashboard V2 work. Maximize correctness while minimizing unnecessary GitHub CI, Vercel deployment, Supabase query/write, and external-service cost.

## Operating loop
> PREFLIGHT → AUDIT → BOUND → IMPLEMENT → CHEAP VERIFY → FULL GATE → MERGE → VERIFY MAIN → LEARN

## 1. Preflight
Before editing:
- Define exactly one logical area and its PR boundary.
- Identify affected files, commands, server actions, repositories, SQL, caches, permissions, and tests.
- Determine whether a database migration is actually required.
- Determine whether any new network call, background job, queue, cron, serverless invocation, or external API is introduced.
- Classify cost impact as Observed, Derived, or Assumption.
- Search for existing production contracts before creating new ones.
- Identify the existing V1 primary workflow and V2 replacement boundary.
If the change is UI-only and existing contracts are sufficient, default to no schema change, no migration, no production data write for testing, no new external service, and no new polling.

## 2. V2 means replacement, not polish
- Do not merely restyle V1.
- Create a dedicated information architecture and workflow.
- Reuse existing production command/API/DB contracts when correct.
- If a V1 workflow remains the primary rendered UI, the area is not V2-complete.
- Preserve working backend behavior while replacing the user-facing workflow.
- Every area needs loading, empty, error, success, responsive, permission, and appropriate interaction states.
- No mock data in production.

Definition of done for a V2 area:
1. Dedicated V2 UI/UX.
2. New information architecture.
3. Main workflow redesigned.
4. Production contracts preserved and verified.
5. No production mock data.
6. Loading/empty/error/success states.
7. Search/filter/pagination where applicable.
8. Responsive/mobile behavior.
9. Permission behavior.
10. Existing V1 tests adapted to V2.
11. Tests prove the V2 workflow.
12. Full Quality Gate passes.
13. Main branch is verified after merge.

## 3. Cost-control rules
### GitHub
- Keep one PR per logical area.
- Prefer a small number of meaningful commits.
- Do not create commits solely to trigger CI.
- Use focused local/static checks before pushing when possible.
- Do not repeatedly rerun expensive workflows without a changed input.
- Full Quality Gate is mandatory before merge.

### Vercel
- CI is the primary compile/test/debug environment.
- Do not use deployment previews as the default debugging loop.
- Avoid unnecessary push/commit cycles that trigger deployments.
- Prefer one validated merge followed by deployment verification.
- Never claim deployment health without evidence.

### Supabase/Postgres
- UI refactors must not cause unnecessary database writes.
- Never seed production data merely to test a UI.
- Never add a migration just because the UI changed.
- Audit existing schema and production command contracts first.
- No unscoped reads.
- No full-table hydration.
- No SELECT * on hot paths.
- No N+1.
- No duplicate requests.
- Paginate growing collections.
- Keep heavy content/JSONB out of list paths unless required.
- Prefer targeted queries and projections.
- If schema/runtime SQL changes, verify live schema and relevant advisors.

### Other services
Treat Cloudflare, Upstash, external APIs, queues, AI providers, and background jobs as cost-bearing boundaries. Do not introduce or exercise them repeatedly without a concrete need.

## 4. Verification tiers
Prefer the cheapest proof that can answer the current question.
### Tier A — static
- source inspection
- typecheck
- lint
- focused search
- focused unit/component tests
### Tier B — repository
- build
- performance checks
- full test shards
- Quality Gate
### Tier C — live infrastructure
Use only when the change affects runtime infrastructure: Supabase live verification, Vercel deployment verification, Cloudflare verification, or external API integration.
Do not jump to Tier C to answer a Tier A/B question.

## 5. Error-learning protocol
Every CI or runtime failure must be fixed in the current PR or explicitly documented as a genuine external blocker.
After fixing an error:
1. Identify root cause.
2. Determine whether the repository rulebook can prevent recurrence.
3. Add/update a rule or regression test when useful.
4. Re-run the smallest relevant verification.
5. Then run the full required gate.
6. Do not carry known failures into merge.

Examples from previous Dashboard V2 work:
- exactOptionalPropertyTypes → preserve explicit optional typing.
- React Hooks lifecycle violations → isolate conditional workflows into component boundaries before hook execution.
- Accessibility test names → assert against rendered accessible names, not internal string assumptions.

## 6. Git/PR discipline
1. Start from verified main.
2. Create one dedicated branch.
3. Audit before implementation.
4. Implement only the scoped area.
5. Run focused checks.
6. Push/create PR only when coherent.
7. Fix CI failures on the same branch.
8. Require full Quality Gate green.
9. Merge only after green.
10. Verify main.
11. Only then start the next area.
Never start the next high-level Dashboard V2 PR while the current one is unverified.

## 7. Claims discipline
Never claim production-ready, zero errors, cost is safe, no extra queries, performance improved, or deployment is healthy unless evidence supports the specific claim.
Use Observed for direct evidence, Derived for calculations from evidence, and Assumption for unverified statements.

## 8. Final review checklist
- [ ] Scope matches PR boundary.
- [ ] No unrelated files changed.
- [ ] No secrets or environment files.
- [ ] No production mock data.
- [ ] Existing production contracts verified.
- [ ] No unnecessary DB migration.
- [ ] No unnecessary DB writes.
- [ ] No duplicate/unbounded data fetches.
- [ ] V2 is genuinely a new workflow, not V1 polish.
- [ ] V1 primary UI is no longer primary.
- [ ] Tests prove the V2 workflow.
- [ ] Mobile/responsive behavior considered.
- [ ] Permissions considered.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] Performance checks pass.
- [ ] All test shards pass.
- [ ] Quality Gate passes.
- [ ] Main is verified after merge.