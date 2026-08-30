# Implementation Plan: Indicate MVP

## Overview

Implement Indicate MVP as one TypeScript Next.js App Router modular monolith serving every tenant, control-plane workflow, exact public hostname, and background operation from one shared deployment. PostgreSQL remains the durable source of truth; Supabase Auth, one private R2 bucket, and one Upstash Redis resource are accessed only through tenant-aware server-side ports. Work is blocked first on creating and explicitly approving `docs/PRD.md` and `docs/ARCHITECTURE.md`, then proceeds through the seven approved Major Stages in strict dependency order.

## Tasks

- [x] 1. Complete the blocking pre-code documentation gate
  - [x] 1.1 Create `docs/PRD.md` from the approved product requirements
    - Preserve the approved scope, tenant model, CMS areas, public surfaces, Telegram workflows, SEO scope, three configurable MVP domains, regional scale target, exclusions, and acceptance boundaries.
    - Add an explicit review-status section without marking the document approved on behalf of reviewers.
    - Do not create application source code in this task.
    - _Requirements: 19.1, 19.3_

  - [x] 1.2 Create `docs/ARCHITECTURE.md` from the approved technical design
    - Document tenant boundaries, same-Organization constraints, one shared resource topology, exact hostname resolution, Cloudflare-only nameserver authority, Vercel hosting-only responsibilities, media keys, publication state/idempotency/recovery, cache partitioning, audit atomicity, migration/promotion, and rollback behavior.
    - Record the approved seven-stage dependency sequence and an explicit review-status section; do not mark approval without reviewer confirmation.
    - Do not create application source code in this task.
    - _Requirements: 19.2, 19.4, 19.5, 19.6, 19.15_

- [x] 2. Pre-code approval checkpoint — obtain explicit reviewer approval of both documents
  - Do not start Task 3 or any application-code task until authorized reviewers have explicitly approved both `docs/PRD.md` and `docs/ARCHITECTURE.md`, and that approval is recorded in the documents or repository review history.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.7_

- [x] 3. Major Stage 1 — establish the single-application foundation, configuration, deployment contracts, and quality tooling
  - [x] 3.1 Scaffold the one shared Next.js App Router TypeScript application and modular boundaries
    - Create conceptual targets `app/`, `src/domain/`, `src/application/`, `src/ports/`, `src/infrastructure/`, and `src/shared/`, with server-only provider modules and enforced import direction.
    - Configure Tailwind CSS and shadcn/ui primitives without introducing another primary framework, application, public template, or tenant-specific build.
    - Add dependency-policy checks that reject replacement databases, auth providers, ORMs, object stores, queue services, DNS providers, hosts, CSS/component systems, messaging platforms, validators, and test frameworks.
    - _Requirements: 1.1, 1.2, 1.10, 2.1, 2.2, 2.3, 2.7, 2.8_

  - [x] 3.2 Implement server-only Runtime Configuration contracts and validation
    - Create conceptual modules such as `src/config/schema.ts`, `src/config/server.ts`, and `src/config/public.ts` using Zod for hosts, Supabase, Cloudflare, Vercel, R2, Upstash, publishing, Telegram/webhooks, security, cache, and SEO values.
    - Enforce exactly three configurable test root hostnames, bounded retry/rate/media/lease values, reserved control-plane hosts, and strict separation of public browser values from secrets.
    - Return deterministic field/category errors with redacted values and fail startup/promotion validation closed.
    - _Requirements: 2.4, 2.9, 2.10, 3.21, 5.1, 5.2, 12.19, 17.11, 17.21, 17.22, 17.23_

  - [x] 3.3 Define single-resource infrastructure ports and deployment validation contracts
    - Create typed ports for one Supabase project/database/Auth instance, one R2 bucket, one Upstash Redis resource, Cloudflare DNS/CDN, one Vercel project, Telegram, clock, identifiers, and health checks.
    - Add configuration/CI assertions that prohibit per-tenant applications, databases, buckets, Redis instances, templates, and deployments.
    - Encode Cloudflare as sole nameserver/DNS/wildcard/SSL-proxy/CDN authority and Vercel as hosting plus exact custom-domain association only; never automate Vercel nameserver transfer or Vercel wildcard registration.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 1.11, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 19.5_

  - [x] 3.4 Implement shared context, error, redaction, and transaction interface types
    - Create `ActorContext`, `HostnameContext`, typed application outcomes, Non-Disclosing Denial envelopes, request IDs, redaction helpers, and tenant transaction interfaces.
    - Ensure application services accept verified contexts rather than reading request globals, and reject missing/conflicting tenant or public context before repository access.
    - _Requirements: 1.14, 1.15, 6.8, 6.9, 6.10, 17.23, 18.3, 18.4_

  - [x] 3.5 Configure deterministic single-run quality scripts and CI stage gates
    - Configure TypeScript typecheck, lint, Vitest unit/property/integration suites, fast-check under Vitest, and Playwright non-UI/non-watch execution with separate test projects and sanitized artifacts.
    - Provide stable scripts such as `typecheck`, `lint`, `test:unit`, `test:property`, `test:integration`, and `test:e2e`; make CI results deterministic and block later stages on failure.
    - Add property-test helpers that report property name, seed, minimized counterexample, and sanitized context.
    - _Requirements: 2.5, 2.6, 20.1, 20.2, 20.3, 20.4, 20.5, 20.8, 20.9, 20.20, 21.25, 21.26_

  - [x]* 3.6 Write the property test for context exclusivity
    - Create a dedicated Vitest/fast-check target under `tests/property/`.
    - **Property 1: Every operation has one valid tenant or public context**
    - **Validates: Requirements 1.14, 1.15**

  - [x]* 3.7 Write the property test for configuration redaction
    - Create a dedicated Vitest/fast-check target with generated secret sentinels and invalid configurations.
    - **Property 2: Configuration errors disclose no secrets**
    - **Validates: Requirements 2.10, 17.23**

  - [x]* 3.8 Write foundation unit and integration tests
    - Test import-boundary enforcement, one-resource topology assertions, Zod path errors, public/server environment separation, typed error mapping, and deterministic redaction.
    - Verify invalid configuration prevents activation without rendering secret values.
    - _Requirements: 1.1–1.10, 2.1–2.10, 20.7, 20.10_

  - [x]* 3.9 Write Stage 1 Playwright and deployment-contract smoke tests
    - Add a minimal non-interactive application smoke flow, control-plane placeholder isolation, client-output secret scan, and configuration/dependency allowlist checks.
    - Verify generated deployment contracts describe only one Vercel project, one Supabase project/database/Auth, one R2 bucket, one Redis resource, and Cloudflare-authoritative DNS.
    - _Requirements: 1.1–1.10, 3.1–3.5, 20.5, 20.7, 20.10_

- [x] 4. Major Stage 1 quality-gate checkpoint
  - Run typecheck, lint, Vitest unit tests, Vitest property tests, Vitest integration tests in single-run mode, and Playwright Stage 1 critical-flow E2E in non-interactive mode.
  - Verify stack boundaries, Runtime Configuration, deployment contracts, secret exclusion, and single-resource invariants; block Major Stage 2 on any failure.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.7, 19.8, 20.1–20.10_

- [x] 5. Major Stage 2 — implement Drizzle persistence, migrations, seed reconciliation, Supabase Auth, tenant transactions, and RBAC
  - [x] 5.1 Implement identity, organization, authorization, domain, and site Drizzle schemas
    - Create conceptual schema modules under `src/infrastructure/db/schema/` for users, organizations, memberships, roles, permissions, role permissions, domains, regions, sites, site settings, subscriptions, API keys, and Telegram mappings.
    - Add composite same-Organization foreign keys, global normalized-host uniqueness, one Auth identity per User, status/version fields, and required indexes/checks.
    - _Requirements: 4.1–4.7, 4.14, 4.20, 4.22–4.26_

  - [x] 5.2 Implement editorial, publisher, media, and audit Drizzle schemas
    - Add publishers, official affiliations, categories, authors, articles, article sites, media, key reservations, cleanup tasks, and append-only audit logs.
    - Enforce one canonical Article row, same-Organization references, one Article Site relation per Article/Site, exact media ownership mode, object-key uniqueness/prefix checks, and affiliation coherence.
    - _Requirements: 4.8–4.15, 4.20, 4.25, 4.27, 8.1, 8.2, 9.8, 11.3–11.8, 18.7, 18.8_

  - [x] 5.3 Implement publishing, replay, activation, invalidation, and seed-coordination Drizzle schemas
    - Add publishing jobs, immutable job targets, transition receipts, replay claims, activation attempts, invalidation tasks, and seed runs with tenant-safe composite constraints.
    - Encode Organization-scoped idempotency uniqueness, finite states, one active target owner, leases/fencing, due-work indexes, and atomic replay uniqueness.
    - _Requirements: 4.28, 4.29, 12.3–12.13, 12.19–12.48, 17.17–17.20_

  - [x] 5.4 Create forward-only Drizzle migrations, database grants, RLS defense, and migration gates
    - Generate reviewed migration artifacts for all schemas, indexes, checks, composite foreign keys, append-only audit protection, and transaction-local actor/Organization context.
    - Configure pooled runtime access and direct migration access as separate server-only paths; prevent activation when the required schema version is absent or migration fails.
    - Add expand/backfill/verify/contract conventions and rollback-compatible release checks.
    - _Requirements: 1.7, 4.15, 4.18–4.21, 18.7, 18.8, 19.6, 19.17, 19.18_

  - [x] 5.5 Implement atomic, idempotent MVP seed reconciliation
    - Create a TypeScript seed command/service that validates exactly three configured non-production root hostnames and Wonosobo, Magelang, and Semarang descriptors before opening one transaction.
    - Upsert by stable external keys, preserve IDs, reconcile only non-identity attributes, report created/updated/unchanged/failed counts, and roll back the complete run on failure.
    - Keep all root hostnames in Runtime Configuration rather than source constants and support later Central Java Regions without source changes.
    - _Requirements: 5.1–5.11_

  - [x] 5.6 Integrate Supabase Auth SSR and local User identity linkage
    - Implement server-side session verification for protected CMS adapters, Auth callback handling, unique local identity resolution, and rejection before Organization data loads.
    - Ensure browser bundles receive only explicitly public Auth configuration and never privileged Supabase or database credentials.
    - _Requirements: 1.6, 4.22, 6.1, 6.2, 17.21, 17.22_

  - [x] 5.7 Implement tenant transactions, Membership/RBAC authorization, and Active Organization switching
    - Create repositories and `AuthorizationService` that derive Organization from verified Membership, API Key, Telegram mapping, or claimed job and include `organization_id` in every predicate.
    - Implement same-shape absent/cross-Organization/unauthorized denials, permission checks, transaction rollback on denial/audit failure, and Active Organization cache/state reset.
    - _Requirements: 4.16–4.19, 4.23, 4.24, 4.26, 4.29, 6.3–6.17_

  - [x]* 5.8 Write the property test for tenant relation coherence and atomicity
    - **Property 6: Tenant relationships preserve Organization coherence atomically**
    - **Validates: Requirements 4.12, 4.13, 4.14, 4.16, 4.17, 4.18, 4.23, 4.24, 4.26, 4.27, 4.28, 4.29, 21.5**

  - [x]* 5.9 Write the property test for seed reconciliation
    - **Property 7: Seed reconciliation is idempotent and atomic**
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

  - [x]* 5.10 Write the property test for RBAC combinations
    - **Property 8: RBAC permits only matching authorized combinations**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.13, 6.15, 20.19, 21.21**

  - [x]* 5.11 Write database and migration integration tests
    - Exercise every required entity, unique/composite constraint, transaction rollback, concurrent relation conflict, RLS defense, append-only Audit Log grant, failed migration gate, and idempotent seed rerun.
    - Include same-Organization success, absent/cross-Organization same-shape denial, and injected mutation/audit failure atomicity.
    - _Requirements: 4.1–4.29, 5.3–5.11, 6.11, 6.15, 6.16, 20.6, 20.11_

  - [x]* 5.12 Write Stage 2 Auth and organization-isolation E2E tests
    - Test unauthenticated denial, authenticated Active Organization selection/switching, stale tenant-state disposal, allowed Membership actions, and same-shape cross-Organization/absent-resource denials.
    - Run Playwright non-interactively against isolated fixtures.
    - _Requirements: 6.1–6.17, 20.5, 20.11_

- [x] 6. Major Stage 2 quality-gate checkpoint
  - Run typecheck, lint, Vitest unit/property/integration suites in single-run mode and Playwright Stage 2 critical-flow E2E in non-interactive mode.
  - Verify migrations, schema constraints, idempotent seeding, Auth identity linkage, Membership/RBAC, persisted trust relations, tenant isolation, and failure atomicity; block Major Stage 3 on failure.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.8, 19.9, 20.1–20.6, 20.8, 20.9, 20.11, 20.19_

- [ ] 7. Major Stage 3 — implement shared Business Services, CMS operations, editorial workflows, analytics, and auditing
  - [ ] 7.1 Implement the shared service transaction/audit foundation
    - Create application command/query handlers, tenant repository adapters, optimistic version helpers, atomic mutation-plus-audit execution, denial auditing, immutable audit querying, and sanitized operational outcomes.
    - Ensure CMS, later API/Telegram adapters, and workers can invoke these services without direct tenant SQL.
    - _Requirements: 6.14–6.16, 7.16–7.21, 18.1–18.17_

  - [ ] 7.2 Build the protected CMS shell and Active Organization experience
    - Create the `indicate.web.id` protected layout, navigation, responsive shell, permission-aware route guards, organization selector, dashboard placeholders, form error preservation, and shared shadcn/Tailwind patterns.
    - Re-authorize and reload all tenant data after organization changes; never render another Organization’s stale data.
    - _Requirements: 7.1, 7.2, 7.15–7.22_

  - [ ] 7.3 Implement Domain, Region, Site, Site Settings, Membership, Role, and audit-log CMS modules
    - Add tenant-aware list/read/create/update/activate/deactivate service methods and Server Actions/routes with Zod validation, optimistic conflicts, required Permissions, and atomic audit events.
    - Keep hostname activation external effects pending for Stage 5 while persisting validated tenant configuration safely.
    - _Requirements: 7.3, 7.4, 7.5, 7.12, 7.13, 7.15–7.22, 18.9–18.11_

  - [ ] 7.4 Implement the Publisher Registry and verified-affiliation lifecycle
    - Create Publisher CRUD/archive, submit/approve/reject, evidence-change re-verification, and Official Affiliation services plus CMS screens.
    - Enforce same-Organization ownership, verifier Permissions, controlled institutional claims, field errors, and atomic before/after audits.
    - _Requirements: 7.6, 8.1–8.18_

  - [ ] 7.5 Implement canonical Article, Category, Author, assignment, and archive workflows
    - Create Zod schemas, tenant-safe repositories, create/read/update/archive/restore, optimistic version conflicts, Category/Author management, and set-based Site assignment.
    - Preserve one canonical Article content row, reject an invalid assignment atomically, and audit every material lifecycle change.
    - _Requirements: 7.7, 7.14, 9.1–9.15_

  - [ ] 7.6 Implement scoped editorial filtering and public-content query contracts
    - Add reusable Region/Site/Category/Publisher/Author/state/search filters that combine all supplied dimensions inside one Organization.
    - Implement public query contracts that require active published Article Site relations and never fall back to unscoped content; Stage 5 will bind them to public routes.
    - _Requirements: 10.1–10.13_

  - [ ] 7.7 Implement dashboard, Basic Analytics, publishing-status projections, and zero/error behavior
    - Create scoped aggregate repositories and CMS surfaces for required Article, Site, Region, Category, Publisher, job, and outcome measures.
    - Return zero/empty series for no matches and reject/sanitize any query that cannot preserve Organization scope.
    - _Requirements: 7.23–7.28, 7.11, 18.12–18.15_

  - [ ] 7.8 Complete the Stage 3 CMS module wiring
    - Wire dashboard, domains, regions, sites, publishers, articles/Categories/Authors, media and publishing placeholders, analytics, settings, and audit logs to shared authorization and query/service contracts.
    - Keep platform customers/subscriptions, external media effects, and publication execution behind their Stage 4/6 dependencies while exposing no orphaned direct-data paths.
    - _Requirements: 7.2–7.9, 7.11–7.28_

  - [ ]* 7.9 Write the property test for scoped aggregate equivalence
    - **Property 9: Tenant aggregates equal a scoped reference model**
    - **Validates: Requirements 7.23, 7.24, 7.25, 7.26, 7.27, 18.14, 18.15**

  - [ ]* 7.10 Write the property test for verified public claims
    - **Property 10: Public claims never exceed verified affiliation**
    - **Validates: Requirements 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 15.8**

  - [ ]* 7.11 Write the property test for canonical Article round trips
    - **Property 11: Canonical Article round trips preserve identity and ownership**
    - **Validates: Requirements 9.2, 9.5, 9.6, 21.1, 21.2**

  - [ ]* 7.12 Write the property test for distinct canonical Site assignment
    - **Property 12: Site assignment is a canonical distinct set**
    - **Validates: Requirements 9.7, 9.8, 9.9, 9.10, 9.11, 21.3, 21.4**

  - [ ]* 7.13 Write the property test for published Site content selection
    - **Property 13: Public content selection requires a published Site relation**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 21.23**

  - [ ]* 7.14 Write the property test for immutable atomic auditing
    - **Property 34: Audit is attributable, immutable, redacted, scoped, and atomic**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.16, 18.17, 21.22**

  - [ ]* 7.15 Write Stage 3 service and CMS integration tests
    - Test all CMS actions, field errors, optimistic conflicts, Publisher verification, official-claim boundaries, canonical content preservation, filter combinations, aggregates, immutable audit queries, denial logs, and injected audit failures.
    - Include tenant-isolation and complete rollback assertions for every security-sensitive mutation family.
    - _Requirements: 7.2–7.32, 8.1–8.18, 9.1–9.15, 10.1–10.13, 18.1–18.17, 20.6, 20.12_

  - [ ]* 7.16 Write Stage 3 CMS critical-flow E2E tests
    - Cover the required CMS areas, responsive navigation, organization switching, corrected form resubmission, Publisher verification, Article lifecycle/assignment/filtering, dashboard/analytics empty states, and audit filtering.
    - Exclude Stage 6 platform-customer workflows until their service implementation exists.
    - _Requirements: 7.1–7.28, 8.1–8.18, 9.1–9.15, 20.5, 20.12_

- [ ] 8. Major Stage 3 quality-gate checkpoint
  - Run typecheck, lint, all Vitest suites in single-run mode, and Playwright Stage 3 critical-flow E2E non-interactively.
  - Verify every Stage 3 CMS area, tenant-scoped aggregates, Publisher/attribution rules, canonical Articles, filters, audit immutability/redaction/atomicity, and cross-Organization denial; block Major Stage 4 on failure.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.9, 19.10, 20.1–20.6, 20.8, 20.9, 20.12, 20.19_

- [ ] 9. Major Stage 4 — implement R2 media, durable publication, Upstash dispatch, concurrency control, retries, and results
  - [ ] 9.1 Implement the private R2 adapter and atomic object-key reservation
    - Create server-only exact-key HEAD/sign PUT/sign GET/delete adapters and a reservation repository using globally unique database candidates before authorization.
    - Generate sanitized collision-resistant names under only `articles/{articleId}/`, `sites/{siteId}/`, or `assets/`; preserve occupied objects and metadata and never grant list/prefix access.
    - _Requirements: 11.1–11.9, 11.20–11.22, 11.27_

  - [ ] 9.2 Implement media upload completion, tenant/public authorization, cleanup, audit, and invalidation intents
    - Validate type/size/purpose/owner, compare R2 HEAD metadata/checksum to reservation data, activate metadata atomically with audit, and enqueue cleanup for rejected/orphan objects.
    - Authorize exact-key private reads only for active Site Settings references or Articles published to the resolved Site; deny cross-Site/cross-Organization/unpublished/archived/unreferenced assets without metadata disclosure.
    - Wire CMS media operations to the shared service.
    - _Requirements: 7.8, 11.10–11.19, 11.23–11.27_

  - [ ] 9.3 Implement canonical publication fingerprints and transactional idempotent acceptance
    - Create versioned canonical option serialization and fingerprinting over Organization, Article, sorted distinct Site set, and options.
    - In one transaction authorize all targets, insert/reuse one Organization/idempotency job, reconcile Article Site rows, create immutable job targets, set queued states, and append audit; return conflict without mutation for fingerprint mismatch.
    - _Requirements: 12.1–12.13_

  - [ ] 9.4 Implement Upstash due-queue scheduling, atomic claims, leases, and state mirroring
    - Create environment-namespaced sorted-set/script adapters with bounded payloads/TTLs and explicit claim tokens.
    - Dispatch only durable job IDs after commit, mark recoverable dispatch state when Redis fails, and treat Redis as a non-authoritative projection.
    - _Requirements: 12.7, 12.14–12.18, 12.45_

  - [ ] 9.5 Implement fenced Publication Worker state transitions and retry planning
    - Atomically claim jobs/targets, increment fencing tokens, transition only through the complete allowed Job and Article Site relations, and make terminal repeats idempotent.
    - Persist transition plus audit before acknowledgement, prevent stale workers from writing, preserve successful targets, and bound attempts/delays by Runtime Configuration.
    - _Requirements: 6.12, 12.19–12.39, 12.44, 12.46–12.48_

  - [ ] 9.6 Implement bounded publication, dispatch, lease, transition, and cleanup reconciliation
    - Create secured short-batch worker/reconciler handlers for durable dispatch gaps, due retries, expired leases, incomplete acknowledgements, and cleanup tasks.
    - Use indexed database scans and same logical IDs; duplicate/overlapping invocations must not duplicate jobs, Article Sites, queue claims, or external outcomes.
    - _Requirements: 12.14–12.18, 12.20–12.37, 12.47, 12.48_

  - [ ] 9.7 Implement publication result/status projections and CMS publishing wiring
    - Derive final state, successful count, and exact persisted successful URL set from target outcomes; expose tenant-scoped job attempts/failures/status to shared services and CMS.
    - Keep failures sanitized and ensure every acknowledged state is durable and audited.
    - _Requirements: 7.9, 12.38–12.46, 18.12, 18.13_

  - [ ]* 9.8 Write the property test for collision-safe structured object keys
    - **Property 14: Object-key reservation preserves prefix and existing data**
    - **Validates: Requirements 11.3, 11.4, 11.5, 11.6, 11.20, 11.21, 11.22, 21.9, 21.27**

  - [ ]* 9.9 Write the property test for media authorization graphs
    - **Property 15: Media access follows the exact ownership and publication graph**
    - **Validates: Requirements 11.7, 11.8, 11.9, 11.14, 11.15, 11.23, 11.24, 11.25, 11.27, 21.10, 21.30**

  - [ ]* 9.10 Write the property test for canonical publication fingerprints
    - **Property 16: Publication fingerprints are canonical**
    - **Validates: Requirements 12.1, 12.2**

  - [ ]* 9.11 Write the property test for matching concurrent idempotent requests
    - **Property 17: Matching idempotent publication requests converge**
    - **Validates: Requirements 12.3, 12.4, 12.8, 12.9, 21.11**

  - [ ]* 9.12 Write the property test for fingerprint conflict preservation
    - **Property 18: Fingerprint conflicts preserve the original job**
    - **Validates: Requirements 12.10, 21.12**

  - [ ]* 9.13 Write the property test for tenant-partitioned idempotency keys
    - **Property 19: Idempotency keys are tenant-partitioned**
    - **Validates: Requirements 12.11, 21.13**

  - [ ]* 9.14 Write the property test for bounded dispatch reconciliation
    - **Property 20: Dispatch reconciliation is idempotent and bounded**
    - **Validates: Requirements 12.14, 12.15, 12.16, 12.17, 12.18, 21.28**

  - [ ]* 9.15 Write the property test for complete publishing transition relations
    - **Property 21: Publishing transitions match the complete allowed model**
    - **Validates: Requirements 12.20, 12.21, 12.23, 12.24, 12.25, 12.26, 12.27, 12.32, 12.33, 12.36, 21.14, 21.15**

  - [ ]* 9.16 Write the property test for terminal transition idempotency
    - **Property 22: Terminal transitions are idempotent**
    - **Validates: Requirements 12.34, 12.35, 21.16**

  - [ ]* 9.17 Write the property test for target-to-job aggregation
    - **Property 23: Job state is the exact aggregate of target states**
    - **Validates: Requirements 12.28, 12.29, 12.30, 12.31, 21.14**

  - [ ]* 9.18 Write the property test for bounded retries that preserve successes
    - **Property 24: Retry execution remains within policy and preserves successes**
    - **Validates: Requirements 12.19, 12.25, 12.27, 12.37, 21.17**

  - [ ]* 9.19 Write the property test for exact Publication Results
    - **Property 25: Publication Result is derived exactly from successful targets**
    - **Validates: Requirements 12.38, 12.39, 12.40, 12.41, 12.42, 12.43, 21.18**

  - [ ]* 9.20 Write the property test for worker fencing
    - **Property 26: Fencing permits one current worker owner**
    - **Validates: Requirements 12.22, 12.44, 12.47, 12.48**

  - [ ]* 9.21 Write R2, Redis, database-concurrency, and recovery integration tests
    - Test occupied-key retry, metadata mismatch, upload rejection/cleanup, exact public media reads, transaction rollback, concurrent matching/conflicting publication requests, Redis dispatch outage/recovery, duplicate reconciliation, expired leases, stale fences, partial success, and sanitized results.
    - Use mocked/in-memory provider ports for generated tests plus representative managed-service contract cases.
    - _Requirements: 11.1–11.27, 12.1–12.48, 20.6, 20.13, 21.26–21.28, 21.30_

  - [ ]* 9.22 Write Stage 4 media and publication critical-flow E2E tests
    - Cover CMS upload authorization/completion, Site assignment, asynchronous multi-Site request, status polling, partial failure/retry, final URL display, and cross-tenant media/job denial.
    - Execute with bounded deterministic fakes and Playwright non-interactively.
    - _Requirements: 7.8, 7.9, 11.1–11.27, 12.1–12.48, 20.5, 20.13_

- [ ] 10. Major Stage 4 quality-gate checkpoint
  - Run typecheck, lint, Vitest unit/property/integration suites in single-run mode and Playwright Stage 4 critical-flow E2E non-interactively.
  - Verify R2 prefixes/reservations/authorization, publication idempotency, queue recovery, fencing, retries, all state transitions, result counts/URLs, tenant isolation, and failure atomicity; block Major Stage 5 on failure.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.10, 19.11, 20.1–20.6, 20.8, 20.9, 20.13, 20.19_

- [ ] 11. Major Stage 5 — implement Cloudflare/Vercel hostname activation, exact routing, public template, SEO, and hostname-aware caching
  - [ ] 11.1 Implement strict hostname normalization, request classification, and exact active Site resolution
    - Create pure hostname value objects and server request adapters that reject missing/malformed/repeated/forwarded overrides with 400 before tenant lookup.
    - Normalize case, one terminal dot, valid port, and IDN ASCII; classify exact reserved control-plane hosts first, then exact unique active Sites, with generic non-indexable unknown/ambiguous outcomes and no suffix/substring fallback.
    - _Requirements: 3.8–3.19, 3.21–3.23_

  - [ ] 11.2 Implement the resumable Cloudflare/Vercel exact-domain activation saga and deployment checks
    - Validate Cloudflare nameservers, proxied apex/wildcard records, edge TLS and Full (strict), associate each exact Site hostname with the single Vercel project, verify a pending probe, then activate/audit/invalidate transactionally.
    - Persist phases/retries, deactivate in the database first, validate old/new mappings, and never transfer nameservers to Vercel or create Vercel wildcard registrations.
    - _Requirements: 3.1–3.7, 3.17, 3.18, 3.20, 5.9, 5.10, 19.5, 19.17, 19.18_

  - [ ] 11.3 Build the one responsive shared Public News Template
    - Create shared header, persisted navigation, homepage, listing, Article detail, Category, search, sidebar, footer, Site-branded 404/error, and Site-safe asset fallback components.
    - Apply Site Settings only from Hostname Context, reserve media dimensions, support mobile/tablet/desktop without horizontal overflow, and preserve keyboard/focus usability.
    - _Requirements: 1.10, 14.1–14.24_

  - [ ] 11.4 Wire public routes to scoped content and media services
    - Implement homepage/list/detail/category/search/feed route adapters using exact Hostname Context and active published Article Site relations.
    - Return branded 404 for recognized Sites and generic noindex outcomes for unknown hosts; never expose another Site’s content or assets on data failure.
    - _Requirements: 10.5–10.13, 11.23–11.27, 14.12–14.24_

  - [ ] 11.5 Implement hostname-correct SEO builders and serializers
    - Create one absolute URL builder plus escaped metadata, Open Graph, NewsArticle, Breadcrumb, Organization, WebSite, robots, sitemap, and RSS serializers derived from exact Hostname Context.
    - Include only Site-visible published content and currently verified claims; emit noindex and no cross-Site canonical/structured data for unknown, 404, pending, or error outcomes.
    - _Requirements: 15.1–15.17_

  - [ ] 11.6 Implement canonical hostname-aware cache identities and safe reads
    - Include normalized host, Organization, Site, Region, locale, path, normalized query, preview, auth class, routing version, and content version in canonical identities.
    - Bypass missing contexts, isolate preview/authenticated traffic, validate embedded context on every hit, and namespace Redis coordination by environment/Organization/Site.
    - _Requirements: 16.1–16.8, 16.14, 16.15_

  - [ ] 11.7 Implement durable invalidation planning, provider dispatch, and safe fallback
    - Convert Article/publication, Site Settings, hostname/Region, Publisher/verification/affiliation, and media-reference mutations into transactional invalidation tasks covering Next.js tags/paths, Redis versions, and exact Cloudflare URL/hostname purges.
    - On failure set Site-scoped bypass and retry boundedly before broader Site purge; invalidate previous and current hostname contexts without touching unrelated Sites.
    - _Requirements: 11.26, 15.16, 16.9–16.13_

  - [ ]* 11.8 Write the property test for convergent hostname normalization
    - **Property 3: Hostname normalization converges**
    - **Validates: Requirements 3.8, 3.9, 3.10, 21.6**

  - [ ]* 11.9 Write the property test for exact active Site resolution
    - **Property 4: Site resolution is exact and active**
    - **Validates: Requirements 3.11, 3.12, 3.13, 3.14, 3.15, 3.18, 21.7**

  - [ ]* 11.10 Write the property test for reserved control-plane conflicts
    - **Property 5: Control-plane hostnames cannot become public Sites**
    - **Validates: Requirements 3.21, 3.22, 3.23, 21.31**

  - [ ]* 11.11 Write the property test for hostname-correct safe SEO
    - **Property 28: SEO output is hostname-correct, visible, and syntactically safe**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13, 15.17, 21.8**

  - [ ]* 11.12 Write the property test for complete cache partitioning
    - **Property 29: Cache identities partition every selection dimension**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.14, 16.15, 21.19, 21.20**

  - [ ]* 11.13 Write the property test for affected-surface invalidation
    - **Property 30: Invalidation planning covers every affected Site surface**
    - **Validates: Requirements 11.26, 15.16, 16.9, 16.10, 16.11, 16.12**

  - [ ]* 11.14 Write public UI unit and accessibility tests
    - Test every public surface, Site settings/fallbacks, responsive component states, keyboard/focus behavior, media dimensions, branded 404/error handling, and safe untrusted text rendering.
    - _Requirements: 14.1–14.24, 20.14_

  - [ ]* 11.15 Write hostname, domain-activation, SEO, cache, and invalidation integration tests
    - Test malformed/unknown/near-match/deactivated/ambiguous hosts, reserved conflicts, Cloudflare-authoritative checks, exact Vercel associations, pending/failed saga recovery, serializer parsing, cache-hit context validation, targeted purge, and bypass fallback.
    - Use provider contract fakes plus representative DNS/domain/cache API checks; assert no Vercel nameserver or wildcard operation exists.
    - _Requirements: 3.1–3.23, 15.1–15.17, 16.1–16.15, 20.14_

  - [ ]* 11.16 Write Stage 5 public-host critical-flow E2E tests
    - Cover apex and regional host rendering, all public surfaces, exact-host isolation, cross-Site Article/media 404s, unknown/error noindex, canonical/OG/JSON-LD/robots/sitemap/RSS outputs, responsive viewport projects, and cache partition behavior.
    - Run Playwright non-interactively with explicit Host values and isolated tenant fixtures.
    - _Requirements: 3.8–3.23, 10.5–10.13, 14.1–14.24, 15.1–15.17, 16.1–16.15, 20.5, 20.14_

- [ ] 12. Major Stage 5 quality-gate checkpoint
  - Run typecheck, lint, Vitest unit/property/integration suites in single-run mode and Playwright Stage 5 critical-flow E2E non-interactively.
  - Verify Cloudflare authority, exact hostname behavior, reserved hosts, public surfaces/responsiveness, branded errors, SEO correctness/safety, media isolation, cache partitioning/invalidation, and no Vercel nameserver transfer; block Major Stage 6 on failure.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.11, 19.12, 20.1–20.6, 20.8, 20.9, 20.14, 20.19_

- [ ] 13. Major Stage 6 — implement Telegram parity, API credentials, rate limits, replay defense, customers, and subscriptions
  - [ ] 13.1 Implement Telegram webhook authentication and shared-service conversation workflows
    - Validate the Telegram secret header, freshness, and replay claim before mapping identity; implement Article fields/image/Region/Site/publication/status/link steps with concise field guidance.
    - Convert transport input to the same Zod schemas and Article/Media/Publication service commands used by CMS, and record mapped actor plus Telegram entry point without secrets.
    - _Requirements: 13.1–13.19_

  - [ ] 13.2 Implement Organization-scoped API Key issue, authentication, rotation, and revocation
    - Use lookup ID plus high-entropy secret, random salt and one-way derived hash, constant-time verification, one-time plaintext response, scopes/status/expiry, and atomic audited rotation/revocation.
    - Never persist or log plaintext credentials; roll back credential state when audit persistence fails.
    - _Requirements: 17.2–17.9, 17.23, 17.24_

  - [ ] 13.3 Implement endpoint-class rate-limit policies and Upstash enforcement
    - Validate bounded policies, partition authenticated identities by endpoint/Organization/actor and public identities by validated source, and use atomic Redis operations with explicit fail-closed/low-risk behavior.
    - Return HTTP 429 with bounded retry guidance and no cross-tenant key collisions.
    - _Requirements: 17.10–17.14_

  - [ ] 13.4 Implement generic authenticated webhook freshness and atomic replay processing
    - Verify source-specific signatures over raw bodies, bounded timestamps, and unique source/replay claims before tenant mutation.
    - Persist one logical outcome for duplicates and reject invalid/stale/replayed requests before additional tenant changes.
    - _Requirements: 17.15–17.20_

  - [ ] 13.5 Implement platform Customer and Organization Subscription administration
    - Create platform-permission-protected customer list/create/read/update/activate/deactivate and tenant subscription status/update services plus CMS surfaces.
    - Enforce platform Permission separately from tenant roles and commit customer/subscription changes with affected-Organization audit events atomically.
    - _Requirements: 7.10, 7.12, 7.29–7.32_

  - [ ] 13.6 Complete settings, API, Telegram, and platform-route wiring
    - Wire Membership/Role/API Key/Subscription/Telegram mapping settings, stable API envelopes, protected webhook routes, and customer navigation to shared services.
    - Apply Zod at every server boundary, Non-Disclosing Denials, rate policies, secret redaction, and server-only credential imports.
    - _Requirements: 7.12, 13.1–13.19, 17.1–17.25_

  - [ ]* 13.7 Write the property test for CMS/Telegram behavioral parity
    - **Property 27: CMS and Telegram commands are behaviorally equivalent**
    - **Validates: Requirements 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13, 21.24**

  - [ ]* 13.8 Write the property test for API Key lifecycle secrecy and scope
    - **Property 31: API key lifecycle preserves credential secrecy and scope**
    - **Validates: Requirements 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9**

  - [ ]* 13.9 Write the property test for bounded rate limiting
    - **Property 32: Rate limits never exceed configured allowances**
    - **Validates: Requirements 17.10, 17.11, 17.12, 17.13, 17.14**

  - [ ]* 13.10 Write the property test for atomic webhook replay claims
    - **Property 33: Webhook replay claims produce one logical outcome**
    - **Validates: Requirements 17.15, 17.16, 17.17, 17.18, 17.19, 17.20, 21.29**

  - [ ]* 13.11 Write Telegram, API Key, rate-limit, replay, customer, and subscription integration tests
    - Test valid/invalid Telegram source and mapping, CMS/Telegram command equivalence, API key issuance/rotation/revocation/scope, rate partition/excess/failure policy, concurrent replay, platform customer permission, subscription rollback, and secret-free audits/errors.
    - _Requirements: 7.29–7.32, 13.1–13.19, 17.1–17.25, 20.6, 20.15_

  - [ ]* 13.12 Write Stage 6 cross-entry-point critical-flow E2E tests
    - Cover Telegram Article/image/Region/Site/publication/status/link flows, equivalent CMS outcomes, API key lifecycle, 429 responses, duplicate webhook outcomes, authorized platform customer management, and unauthorized customer denial.
    - Execute Playwright and webhook simulations once, non-interactively.
    - _Requirements: 7.29–7.32, 13.1–13.19, 17.1–17.25, 20.5, 20.15_

- [ ] 14. Major Stage 6 quality-gate checkpoint
  - Run typecheck, lint, Vitest unit/property/integration suites in single-run mode and Playwright Stage 6 critical-flow E2E non-interactively.
  - Verify Telegram authentication/parity, API Key lifecycle, rate limits, replay atomicity, customer/subscription authorization, tenant isolation, failure atomicity, and client/server secret boundaries; block Major Stage 7 on failure.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.12, 19.13, 20.1–20.9, 20.15, 20.19_

- [ ] 15. Major Stage 7 — automate production-readiness validation for the configured MVP matrix
  - [ ] 15.1 Create configuration-driven three-domain/three-region readiness fixtures
    - Build test fixture loaders that consume exactly three normalized Runtime Configuration root hostnames and seed Wonosobo, Magelang, and Semarang without embedding any root hostname in source.
    - Generate apex and regional Site/Article/media/publication scenarios while preserving one shared app, database, bucket, Redis resource, and template.
    - _Requirements: 5.1–5.10, 19.13, 20.16, 20.17_

  - [ ] 15.2 Implement a fail-closed production-readiness validation command
    - Validate Runtime Configuration, required schema/migrations, Supabase Auth/DB, private R2, Upstash, Telegram webhook, cron secret, Cloudflare nameservers/apex/wildcard/proxy/TLS, exact Vercel domain associations, and active database mappings.
    - Produce sanitized deterministic results and prevent promotion on any failure; include no operation that transfers nameservers or creates tenant-specific resources/deployments.
    - _Requirements: 3.20, 19.17, 19.18, 20.8, 20.18_

  - [ ]* 15.3 Write the full three-domain by three-region automated acceptance matrix
    - Validate publication request/processing/result, public Site selection, media authorization, SEO, cache partitioning, tenant denial, dashboard/analytics, Telegram status/links, and audit outcomes across all configured roots and Regions.
    - Assert no content, media, cache, credential, job, analytics, or Audit Log crosses Organizations or hostnames.
    - _Requirements: 19.13, 20.16, 20.19_

  - [ ]* 15.4 Write automated promotion and rollback procedure tests
    - Test migration/config/dependency failure gates, schema-compatible application rollback, resumable external activation/invalidation/queue work, and continued Cloudflare nameserver authority.
    - Verify failed validation cannot promote a release and rollback does not create a second deployment topology.
    - _Requirements: 19.6, 19.17, 19.18, 20.18_

  - [ ]* 15.5 Write final topology, source-hardcoding, and secret-boundary checks
    - Scan source/configuration for the three runtime hostname values, forbidden per-tenant resources/templates/apps, Vercel nameserver/wildcard operations, unapproved primary dependencies, client-bundled secrets, and plaintext credentials in logs/fixtures.
    - Fail deterministically when any prohibited pattern or cross-Organization result is found.
    - _Requirements: 1.1–1.13, 2.7–2.10, 3.1–3.5, 17.21–17.24, 20.7, 20.17–20.19_

  - [ ]* 15.6 Consolidate the final non-interactive quality and critical-flow suites
    - Wire the complete TypeScript, lint, Vitest unit/property/integration, Playwright E2E, deployment validation, topology, and secret scans into one deterministic CI gate with stage-level diagnostics.
    - Ensure test commands never enter watch, UI, or interactive mode and property failures retain seed/minimized sanitized reproduction data.
    - _Requirements: 20.1–20.20, 21.25_

- [ ] 16. Final Major Stage 7 quality-gate checkpoint
  - Run typecheck, lint, all Vitest unit/property/integration tests in single-run mode, all Playwright critical-flow E2E non-interactively, and the production-readiness validation command.
  - Verify the complete configured three-domain/three-region matrix, no hardcoded test root, no tenant/resource leakage, rollback safety, one shared topology, and uninterrupted Cloudflare nameserver authority.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.13–19.18, 20.1–20.20, 21.1–21.31_

## Notes

- Tasks 1 and 2 are the user-required documentation exception to the otherwise code-only implementation plan. Task 2 is a hard human approval gate; no application-code task may begin before it is satisfied.
- Tasks marked with `*` are optional test subtasks and can be skipped for a faster MVP, but every Major Stage quality gate remains mandatory and must run all implemented suites.
- Every property test must live in its own conceptual test target, use the design tag `Feature: indicate-mvp, Property N: <property title>`, run under Vitest/fast-check, and report a seed plus minimized sanitized counterexample on failure.
- Every database or service mutation task must include same-Organization success, absent/cross-Organization Non-Disclosing Denial, and injected failure atomicity where applicable.
- No task may create separate tenant applications, databases, Supabase projects, R2 buckets, Redis instances, public templates, Vercel projects, or deployments. Site onboarding is persisted data plus control-plane configuration in the one shared deployment.
- Cloudflare remains authoritative for nameservers, DNS records, wildcard records, SSL proxying, and CDN behavior. Vercel is application hosting with exact Site-domain associations only; no task may transfer nameservers to Vercel or use Vercel wildcard registration.
- Checkpoint tasks are blocking and intentionally excluded from the machine scheduling graph; each following wave is conditional on the preceding checkpoint being explicitly satisfied.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5"] },
    { "id": 5, "tasks": ["3.6", "3.7", "3.8", "3.9"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2"] },
    { "id": 8, "tasks": ["5.3"] },
    { "id": 9, "tasks": ["5.4"] },
    { "id": 10, "tasks": ["5.5", "5.6"] },
    { "id": 11, "tasks": ["5.7"] },
    { "id": 12, "tasks": ["5.8", "5.9", "5.10", "5.11", "5.12"] },
    { "id": 13, "tasks": ["7.1"] },
    { "id": 14, "tasks": ["7.2"] },
    { "id": 15, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 16, "tasks": ["7.6", "7.7"] },
    { "id": 17, "tasks": ["7.8"] },
    { "id": 18, "tasks": ["7.9", "7.10", "7.11", "7.12", "7.13", "7.14", "7.15", "7.16"] },
    { "id": 19, "tasks": ["9.1"] },
    { "id": 20, "tasks": ["9.2"] },
    { "id": 21, "tasks": ["9.3"] },
    { "id": 22, "tasks": ["9.4"] },
    { "id": 23, "tasks": ["9.5"] },
    { "id": 24, "tasks": ["9.6"] },
    { "id": 25, "tasks": ["9.7"] },
    { "id": 26, "tasks": ["9.8", "9.9", "9.10", "9.11", "9.12", "9.13", "9.14", "9.15", "9.16", "9.17", "9.18", "9.19", "9.20", "9.21", "9.22"] },
    { "id": 27, "tasks": ["11.1"] },
    { "id": 28, "tasks": ["11.2"] },
    { "id": 29, "tasks": ["11.3"] },
    { "id": 30, "tasks": ["11.4"] },
    { "id": 31, "tasks": ["11.5", "11.6"] },
    { "id": 32, "tasks": ["11.7"] },
    { "id": 33, "tasks": ["11.8", "11.9", "11.10", "11.11", "11.12", "11.13", "11.14", "11.15", "11.16"] },
    { "id": 34, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 35, "tasks": ["13.6"] },
    { "id": 36, "tasks": ["13.7", "13.8", "13.9", "13.10", "13.11", "13.12"] },
    { "id": 37, "tasks": ["15.1"] },
    { "id": 38, "tasks": ["15.2"] },
    { "id": 39, "tasks": ["15.3", "15.4", "15.5"] },
    { "id": 40, "tasks": ["15.6"] }
  ]
}
```
