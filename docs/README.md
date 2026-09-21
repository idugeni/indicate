# Indicate documentation index

> **Status:** Living index — update when adding, renaming, or retiring any document.
> **Owner:** Platform team.
> **Naming rule:** root files stay `UPPERCASE.md` (GitHub community standard); everything under `docs/` uses `kebab-case.md`.

## Architecture and design

| Document | Status | Contents |
|---|---|---|
| [architecture](architecture.md) | Approved 2026-08-30 | MVP topology, invariants, deployment and hostname design. Code wins on conflict. |
| [architecture rules](architecture-rules.md) | Advisory | Performance and caching rules for contributors. |
| [templates](templates.md) | Advisory | Ten public news templates in `src/modules/site/components/network/templates/`. |

## Operations

| Document | Status | Contents |
|---|---|---|
| [migrations](migrations.md) | Advisory | Forward-only Drizzle/PostgreSQL procedure, promotion gate, Supabase roles. |
| [production readiness runbook](production-readiness-runbook.md) | Advisory | Pre-promotion checks and rollback. Read-only, warns instead of blocking. |
| [release checklist](release-checklist.md) | Advisory | Release order: pre-release → promote → smoke test → monitor → rollback. |
| [cloudflare baseline](cloudflare-baseline.md) | Living | Canonical per-zone values, new-zone checklist, review cadence. |
| [domains](domains.md) | Living | Indicate-related domain inventory. |
| [active domains](active-domains.md) | Living ledger | Activation/deactivation ledger; update on every change. |
| [ops lessons](ops-lessons.md) | Living | Incident-derived procedures (tenant context, Supavisor sessions). |
| [telegram notifications](telegram-notifications.md) | Partially implemented | Group-only notification decision log and rollout scope. |

## Legal and per-tenant records

| Document | Status | Contents |
|---|---|---|
| [dpa](dpa.md) | Enterprise template | Data Processing Addendum (UU PDP No. 27/2022). Sign with SOW per deal. |
| [templates/sow template](templates/sow-template.md) | Template | Statement of Work for custom enterprise work. |
| `tenants/` | Per-tenant notes | Lowercase per-tenant records (e.g. `upt-jateng.md`). |
| `templates/brand/` | Locked | Brand-letter masters; `gradient/` is read byte-wise by the `tenant-onboarding` skill — do not delete or rename. `original/` is the same master archive. |
| `assets/` | Figures | SVGs referenced by documents. |

## Root community files (stay `UPPERCASE.md`)

`README.md` · `CONTRIBUTING.md` · `CODE_OF_CONDUCT.md` · `SECURITY.md` · `SUPPORT.md` · `CHANGELOG.md` · `LICENSE` · `AGENTS.md` · `CLAUDE.md`
