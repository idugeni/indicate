# Documentation Health Audit — 2026-10-11

**Repository:** `idugeni/indicate`  
**Base:** `main` at `96b04f53e74566da64fc7199107ea865c705e561`  
**Date:** 2026-10-11  
**Scope:** Markdown/MDX inventory, authoritative instructions, audit/report freshness, index consistency, lifecycle policy, and high-risk contradiction candidates.

## Executive summary

The repository tree contains **209 Markdown/MDX files** at this audit base. This is an inventory count, not a claim that all 209 documents have been line-by-line validated against runtime behavior. The highest-value cleanup is to distinguish current instructions from historical evidence, reconcile report status with merged work, and make deletion evidence-based.

This audit intentionally does **not** delete archived third-party reference material, design skill sources, legal templates, or historical audit evidence merely because they are large or old.

## Confirmed findings

### DOC-001 — AI call-flow audit describes pre-remediation defects as current

**File:** [`AI_CALL_FLOW_AUDIT.md`](../../AI_CALL_FLOW_AUDIT.md)  
**Severity:** High documentation risk  
**Evidence:** Its executive summary describes embedding paths as bypassing guards and the streaming path as missing quota/injection controls. [`AI_REMEDIATION_REPORT.md`](../../AI_REMEDIATION_REPORT.md) says F-01/F-02 were fixed and regression-tested. The former report's language reads as a current verdict, while it is a point-in-time source audit.  
**Action:** Mark it as a historical baseline, link the remediation report, and require revalidation of its remaining findings before treating them as open. Do not delete it: the before-state and rationale are useful audit evidence.  
**Remaining verification:** Confirm every claim against current code/tests, especially the separate credential-probe path and the exact provider-call amplification bound.

### DOC-002 — Dashboard V2 audit contains stale PR/verification status

**File:** [`docs/audits/dashboard-v2-deep-audit-2026-10-09.md`](dashboard-v2-deep-audit-2026-10-09.md)  
**Severity:** High documentation risk  
**Evidence:** It says PR #53 remains open and draft. GitHub reports PR #53 was merged on 2026-10-09. Its verification section is tied to an earlier branch SHA and must not be read as evidence for current `main`.  
**Action:** Preserve the report as a historical audit snapshot; correct the PR status and explicitly separate the checks that passed on the historical SHA from work merged afterward. Record that the runtime/browser/tenant-role checks listed there remain unverified unless separate evidence is attached.

### DOC-003 — Engineering rules and release checklist have ambiguous gate semantics

**Files:** [`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md), [`docs/release.md`](../release.md)  
**Severity:** High process risk  
**Evidence:** `AGENTS.md` requires verification and says not to claim completion while relevant P0/P1/P2 findings remain unresolved. `CLAUDE.md` and `docs/release.md` describe portions of the workflow as relaxed/advisory.  
**Action:** Clarify that repository CI/required checks and task-specific safety constraints are hard gates, while the release checklist's live production readiness probes are advisory only when explicitly described as read-only, unavailable, or owner-operated. An advisory checklist must never override required CI, security, data-integrity, or an explicit owner instruction.

### DOC-004 — Documentation index needs an explicit audit register

**File:** [`docs/README.md`](../README.md)  
**Severity:** Medium  
**Evidence:** The index identifies active and archived documentation, but did not provide one place to track document-health findings and disposition.  
**Action:** Link this audit and keep it as a dated snapshot. Update the index when documents are renamed, archived, consolidated, or removed. **Completed in the documentation-health PR.**

### DOC-005 — Active operational documents were not discoverable from the index

**File:** [`docs/README.md`](../README.md)  
**Severity:** Medium  
**Evidence:** A path-by-path comparison against the repository tree found `docs/ads.md`, `docs/ai-operations.md`, `docs/architecture/operator-rollout.md`, and `docs/audits/dashboard-v2-deep-audit-2026-10-09.md` were not individually linked from the index. The tenant note `docs/tenants/upt-jateng.md` is covered by the existing per-tenant directory entry and is not classified as an index omission. The Dashboard V2 audit is historical evidence, not a current runtime attestation.
**Action:** Add the active operations documents and operator rollout guide to the index, and list the Dashboard V2 audit under documentation health. No content was deleted; this is a discoverability defect, not proof of redundancy. **Index links added in the follow-up PR.**

## Lifecycle and deletion policy

A document is not obsolete solely because it is old, large, unchanged, or called an audit/report. Before deletion, check:

1. Incoming links from Markdown, source comments, skills, prompts, workflows, and scripts.
2. Whether it is a canonical policy, legal/template artifact, vendor reference, or historical evidence.
3. Whether its procedures and facts are superseded by a clearly identified replacement.
4. Whether any unique decisions, incident evidence, or remediation rationale would be lost.
5. Whether the index, links, and checks are updated in the same change.

Prefer **update → mark historical → archive/consolidate → delete only when proven redundant**.

## Initial disposition

| Document | Disposition | Reason |
|---|---|---|
| `AI_CALL_FLOW_AUDIT.md` | Keep; label historical baseline | Unique pre-remediation evidence; current-tense claims can mislead |
| `AI_REMEDIATION_REPORT.md` | Keep; label point-in-time verification | Records the claimed fix and its original test context |
| `docs/audits/dashboard-v2-deep-audit-2026-10-09.md` | Keep; correct stale PR status | Useful evidence; contains an obsolete open/draft statement |
| `AGENTS.md` | Keep authoritative | Repository engineering rules |
| `CLAUDE.md` | Keep as navigation/reference card | Explicitly defers binding rules to `AGENTS.md`; review contradictions rather than duplicate it |
| `docs/release.md` | Keep; clarify gate boundary | Contains operational procedures not replaced by the general rulebook |
| `docs/vercel-multi-tenant/` | Keep as declared archive | The documentation index explicitly marks it as an archive; upstream docs win on conflict |
| `.agents/skills/apple-hig/` | Keep pending usage/source review | Distilled skill references may be consumed by agents; file count alone is not grounds for removal |

## Verification boundary

This is a source/documentation consistency audit, not a full semantic proof of every document against production. It did not access production databases, grant permissions, call AI providers, deploy, or change runtime configuration. No file is deleted by this audit unless a redundant/unreferenced artifact is demonstrated with evidence.

## Follow-up checklist

- [ ] Reconcile remaining claims in the AI audit against current source and tests.
- [ ] Review other dated audit/remediation reports for stale PR status, commit SHA, and test counts.
- [ ] Validate Markdown links and headings using the repository's documented lint/check commands.
- [x] Compare all `docs/**/*.md` paths against the index and add missing links for active operations and audit documents.
- [ ] Inspect inbound references before deleting or consolidating any file.
- [ ] Keep runtime/browser/tenant isolation status explicitly marked unverified until supported by test evidence.
