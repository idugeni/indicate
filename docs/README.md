# Dokumentasi Indicate

Indeks dokumen repo. Dokumen kanonis di root memakai huruf kapital; catatan operasional dan per-tenant ada di subfolder.

## Kanonis (root)

- `ARCHITECTURE.md` — arsitektur MVP (approved).
- `MIGRATIONS.md` — operasi migrasi Drizzle/PostgreSQL (advisory).
- `PRODUCTION_READINESS_RUNBOOK.md` — checklist rilis dan rollback (advisory).
- `CLOUDFLARE-BASELINE.md` — baseline operasional Cloudflare per zona (living document).
- `DOMAINS.md` — inventaris domain Indicate (advisory, living document).
- `TEMPLATES.md` — sepuluh template tenant di `src/modules/site/components/network/templates/` (advisory).
- `DPA.md` — Adendum Pemrosesan Data untuk paket Enterprise.

## Operasional

- `tenants/` — catatan per-tenant, lowercase (`upt-jateng.md`).
- `templates/` — `SOW-TEMPLATE.md` (dirujuk runbook) + PNG referensi visual template (kebab-case).
- `templates/brand/` — master huruf brand; **terkunci**: `gradient/` hanya dibaca byte-nya oleh skill `tenant-onboarding`, dilarang hapus/rename; `original/` adalah arsip master yang sama, dilarang hapus/rename.
- `assets/` — SVG yang dirujuk dokumen.
