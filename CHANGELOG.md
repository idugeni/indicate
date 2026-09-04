# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `LICENSE` — Apache License 2.0 (Copyright 2026 Eliyanto Sarage)
- `SECURITY.md` — vulnerability reporting, secret-handling, and promotion-safety policy
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 community standards
- `SUPPORT.md` — help channels, issue requirements, and supported setup
- `.github/PULL_REQUEST_TEMPLATE.md` — gate evidence plus tenant-isolation, migration, and security checklists
- `.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml` (+ `config.yml` routing security reports privately)
- `.github/CODEOWNERS` and `.github/dependabot.yml` (weekly npm + GitHub Actions updates)
- README links to Contributing, Security, Support, Code of Conduct, Changelog, and License

### Fixed

- `CONTRIBUTING.md` — corrected repository layout to `src/app/`, `src/modules/`, `src/core/`, `src/data/`, `src/integrations/`, `src/ui/`; fixed migration path to `src/data/migrations/` in filename order with credential separation; fixed design-system link to `docs/DESIGN.md`; aligned commit scopes and import boundaries with `docs/ARCHITECTURE.md`

### Changed

- Documented route groups as `(site)`, `(network)`, `(auth)`, `(dashboard)` with group-specific `_composition/` roots and per-segment `loading.tsx` / `error.tsx` conventions

### Added

- `CLAUDE.md` — AI assistant context and project conventions
- `CONTRIBUTING.md` — development workflow and contribution guidelines
- `CHANGELOG.md` — project change history
- Route group layouts with appropriate error boundaries and loading states

## [0.1.0] - 2026-09-02

### Added

- Complete seven-stage Indicate MVP
- Multi-tenant CMS with exact-host routing and tenant isolation
- Publication workflows with PostgreSQL-backed durability, bounded retries, leases, and fencing
- Tenant-isolated media storage via private Cloudflare R2 with ownership-scoped authorization
- Telegram bot integration with identity-mapped editorial workflows
- REST API with scoped API key authentication
- Automated release quality gates and production readiness inspection
- Forward-only database migration sequence (0000–0024) with RLS, audit, and runtime config
- Comprehensive test layers: unit, property, integration, e2e, PostgreSQL contracts, provider contracts
- Hostname-aware public news template with per-site SEO, RSS, sitemap, and JSON-LD
- Design system contract (`DESIGN.md`) — dark indigo control-room aesthetic with brass accent
- Policy enforcement scripts for import boundaries, client secrets, migrations, and deployment
- CI pipeline with deterministic quality gate and live PostgreSQL contract jobs
