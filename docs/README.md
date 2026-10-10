# Indicate documentation index

> **Status:** Living index — update when adding, renaming, or retiring any document.
> **Owner:** Platform team.
> **Naming rule:** root files stay `UPPERCASE.md` (GitHub community standard); everything under `docs/` uses `kebab-case.md`.

## Dua aturan yang membuat dokumen ini tetap berguna

**Satu fakta, satu tempat.** Kalau sebuah angka atau prosedur hanya benar di satu
file, file itu yang mengaturnya. Angka yang sama di dua dokumen hampir pasti akan
berbeda satu hari, dan yang salah akan dipakai sebagai acuan.

**Angka selalu bertanggal dan menyebut sumbernya.** Angka yang ditulis tanpa
tanggal dan tanpa cara menghitungnya akan basi tanpa ada yang menyadarinya.
Kalau butuh angka hari ini, hitung ulang dari sumber; jangan menyalin dari
dokumen mana pun, termasuk dari sini.

## Documentation health

| Document | Status | Contents |
|---|---|---|
| [documentation health audit](audits/documentation-health-audit-2026-10-11.md) | Snapshot 2026-10-11 | Dated findings for stale audit status, authority conflicts, lifecycle rules, and evidence-based deletion. Re-run after major documentation or architecture changes. |
| [Dashboard V2 deep audit](audits/dashboard-v2-deep-audit-2026-10-09.md) | Historical snapshot 2026-10-09 | Source-level review of 19 dashboard views, targeted fixes, and explicit runtime-verification gaps. |

## Architecture and design

| Document | Status | Contents |
|---|---|---|
| [architecture](architecture.md) | Approved 2026-08-30 | MVP topology, invariants, deployment and hostname design. Sections 1-20 are binding; §21 holds the advisory registers (owner relaxations, decision boundaries, approval record) and binds nothing. Code wins on conflict. |
| [architecture rules](architecture-rules.md) | Advisory | Performance and caching rules for contributors. |
| [templates](templates.md) | Advisory | Ten public news templates in `src/modules/site/components/network/templates/`. |
| [operator rollout](architecture/operator-rollout.md) | Operational reference | Owner-operated rollout sequence and operational constraints. |

## Product operations

| Document | Status | Contents |
|---|---|---|
| [ads](ads.md) | Living | Advertising surfaces, placements, and operational behavior. |
| [AI operations](ai-operations.md) | Operational runbook | AI provider routing, credential rotation, budget guards, and usage/log triage. |

## Operations

| Document | Status | Contents |
|---|---|---|
| [migrations](migrations.md) | Advisory | Forward-only Drizzle/PostgreSQL procedure, promotion gate, Supabase roles. |
| [release](release.md) | Advisory | Readiness checks, release order (pre-release → promote → smoke → monitor), and rollback. Read-only, warns instead of blocking. |
| [cloudflare baseline](cloudflare-baseline.md) | Living | Canonical per-zone values, new-zone checklist, review cadence. |
| [domains](domains.md) | Living | Domain inventory, live counts, and the activation ledger. The one place that says how many domains, sites, and Vercel associations exist. |
| [ops lessons](ops-lessons.md) | Living | Incident-derived procedures (tenant context, Supavisor sessions). |
| [regions](regions.md) | Living | Single source for province geography in `regions` (naming rules + 38-row roster). |
| [vercel multi-tenant archive](vercel-multi-tenant/README.md) | Archive 2026-09-24 | Verbatim Vercel multi-tenant platform docs (10 pages) for internal reference. Upstream wins on conflict; excluded from `lint:md` and link checks. |

## Legal and per-tenant records

| Document | Status | Contents |
|---|---|---|
| [dpa](dpa.md) | Enterprise template | Data Processing Addendum (UU PDP No. 27/2022). Sign with SOW per deal. |
| [templates/sow template](templates/sow-template.md) | Template | Statement of Work for custom enterprise work. |
| `tenants/` | Per-tenant notes | Lowercase per-tenant records (e.g. `upt-jateng.md`). |
| `templates/brand/` | Locked | Brand-letter masters; `gradient/` is read byte-wise by the `tenant-onboarding` skill — do not delete or rename. `original/` is the same master archive. |

## Root community files (stay `UPPERCASE.md`)

`README.md` · `CONTRIBUTING.md` · `CODE_OF_CONDUCT.md` · `SECURITY.md` · `SUPPORT.md` · `CHANGELOG.md` · `THIRD-PARTY-NOTICES.md` · `LICENSE` · `AGENTS.md` · `CLAUDE.md`
