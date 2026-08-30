# Indicate MVP Product Requirements Document

## Review status

- **Status:** Approved
- **Approval gate:** Satisfied on 2026-08-30 for this document and `docs/ARCHITECTURE.md`.
- **Approval record:** User/reviewer approval was explicitly provided through this session on 2026-08-30.
- **Source of truth:** `.kiro/specs/indicate-mvp/requirements.md`
- **Scope of this version:** Approved product definition. This approval clears the pre-code documentation gate for a subsequent invocation; this document does not itself perform application or infrastructure changes.

## 1. Product summary

Indicate MVP is a multi-tenant media syndication and publishing platform operated from the central CMS at `indicate.web.id`. A single shared deployment serves multiple Indonesian `.web.id` news domains and their regional subdomains. The CMS, APIs, background publishing, and Telegram workflows use the same tenant-aware business services so that behavior and authorization do not diverge by entry point.

The MVP starts with exactly three test root-domain hostnames supplied through runtime configuration and with the Wonosobo, Magelang, and Semarang regions. The product must remain data- and configuration-driven so it can grow to as many as 100 active root domains and all Central Java regions without tenant-specific applications or deployments.

## 2. Product goals

1. Operate all organizations, sites, public hostnames, CMS workflows, APIs, jobs, and Telegram workflows from one shared application and managed-resource topology.
2. Protect every tenant-scoped read, mutation, job, object, cache entry, aggregate, credential, and audit event with explicit organization ownership and authorization.
3. Let one canonical article be assigned and asynchronously published to multiple same-organization sites without duplicating canonical content.
4. Resolve public sites dynamically and exactly from normalized request hostnames, with no fallback organization or suffix/substring matching.
5. Provide complete central editorial operations, publisher verification, regional filtering, media management, publication monitoring, analytics, settings, and audit review.
6. Render one responsive, site-branded public news experience with hostname-correct SEO, feeds, media authorization, and cache isolation.
7. Reuse identical business rules across CMS, API, background, and Telegram entry points.
8. Establish documentation, security, deployment, and quality gates before dependent implementation begins.

## 3. Users and actors

### Platform administrator

An authenticated user with an explicit platform-level permission to administer customer organizations and view or change subscription status across tenant boundaries. Platform access is never inferred from an organization role.

### Organization administrator

An authenticated organization member who manages organization configuration, memberships, roles, domains, regions, sites, publishers, credentials, Telegram mappings, and settings according to assigned permissions.

### Editor or publisher

An authorized user, scoped API key, or mapped Telegram identity that creates and manages canonical articles, media, site assignments, and publication requests within one organization.

### Reader or crawler

A public actor accessing a configured root domain or regional subdomain. Public access is scoped by an exact active hostname context and can see only content published to that resolved site.

### System worker or reconciler

A background actor that adopts exactly one organization from an atomically claimed durable record, revalidates tenant ownership, and processes bounded publication or recovery work.

## 4. Mandated shared platform model

The platform must use exactly:

- one TypeScript Next.js App Router application and codebase;
- one Vercel project used for application hosting only;
- one Supabase project containing one PostgreSQL database and Supabase Auth;
- Drizzle ORM for application database access, schema definitions, and migrations;
- one private Cloudflare R2 bucket shared by all organizations;
- one Upstash Redis resource shared by all organizations;
- one responsive Public News Template for all root domains and regional subdomains.

Cloudflare remains the sole authority for nameservers, DNS records, wildcard DNS, SSL proxying, and CDN behavior for every managed hostname. Managed domains must not delegate nameservers to Vercel. Vercel hosts the application and associates exact site hostnames only.

Adding an organization, domain, region, or site must use persisted data and runtime configuration rather than another application, project, bucket, database, Redis resource, template, or deployment.

## 5. Tenant and authorization model

An Organization is the ownership boundary. Every tenant-scoped entity carries an organization identifier, and every relation lookup, query, aggregate, mutation predicate, job, cache namespace, media authorization, and audit event must preserve that boundary.

A User is linked uniquely to one Supabase Auth identity. A Membership associates one User, one Organization, and one Role. Roles grant named Permissions. Protected CMS requests require a valid Supabase Auth session, an active Membership in the selected Active Organization, and the required Permission.

API Keys are scoped to one Organization and explicit permissions or scopes. Telegram identities require an active organization-scoped mapping to an authorized platform identity and role or permission set. Background jobs revalidate ownership of the job, article, targets, site assignments, and media before processing.

Absent, unauthorized, and cross-organization tenant resources use the same non-disclosing denial status and response shape. A failed authorization, validation, audit, uniqueness, or referential-integrity check must leave tenant data unchanged. Changing the Active Organization must discard prior tenant-scoped UI/query state and re-evaluate Membership and Permissions.

## 6. Domain, region, site, and hostname requirements

### Domain and regional scale

- Runtime configuration supplies exactly three syntactically valid, distinct test root-domain hostnames for MVP seeding.
- Production root hostnames must not be hardcoded in source.
- Initial regions are Wonosobo, Magelang, and Semarang.
- Additional Central Java regions use stable identifiers, names, and hostname-safe slugs and require no source-code change.
- The shared deployment supports up to 100 active root domains and all Central Java regions under each configured root.

### Hostname behavior

For every public request, the application must:

1. require a syntactically valid hostname;
2. normalize it to lowercase ASCII, remove a valid request port and one terminal DNS dot;
3. classify exact reserved control-plane hostnames before any public-site lookup;
4. resolve an active Site only by exact normalized-hostname equality;
5. return HTTP 400 before tenant lookup for a missing or invalid hostname;
6. return a non-indexable HTTP 404 for a valid but unknown, suffix-only, prefix-only, or substring-only hostname;
7. reject ambiguous duplicate active mappings as invalid configuration with a non-indexable error;
8. stop resolving a site immediately after deactivation.

The resolved Hostname Context contains the normalized hostname, Organization, Root Domain, Site, and optional Region. This same context drives public content, URL generation, authorization boundaries, SEO, analytics attribution, media access, and cache identity. No request may select a fallback organization.

`indicate.web.id` and configured API and webhook hosts are reserved control-plane hostnames. Domain, site, wildcard, or seed values that conflict with them must be rejected before activation. Control-plane hosts expose only their configured route families.

## 7. Core data and content model

The shared PostgreSQL database includes at least: users, organizations, memberships, roles, permissions, role permissions, domains, regions, sites, publishers, official affiliations, articles, article sites, categories, authors, media, publishing jobs, API keys, subscriptions, Telegram identity mappings, and audit logs.

Required model rules include:

- one local User per Supabase Auth identity;
- globally unique normalized root-domain and public-site hostnames;
- every Site belongs to exactly one Organization and Root Domain and optionally one same-organization Region;
- every Article belongs to exactly one Organization and Region;
- Publisher, Category, Author, Media, Domain, Region, Site, Membership, Role, Telegram mapping, affiliation, job, and target relations must remain organization-coherent;
- canonical title, body, source, author, category, and Region data exist only on the Article;
- an Article Site represents one Article-to-Site assignment and destination publication state, URL, and timestamp, without copied canonical content;
- repeated assignment preserves one relationship per distinct same-organization Site;
- failed multi-record changes roll back completely;
- concurrent incompatible unique-relation writes retain one valid result and return a deterministic conflict.

Drizzle defines schema, constraints, indexes, relationships, and migrations. Failed migrations prevent activation of dependent application code.

## 8. Central CMS scope

The protected CMS is served from `indicate.web.id` and provides:

- a dashboard with active domain/site totals, active and archived article totals, jobs by publication state, successful and failed site outcomes, and active media totals;
- Domains CRUD plus activation/deactivation;
- Regions CRUD plus activation/deactivation;
- Sites and Site Settings CRUD plus activation/deactivation;
- Publisher/source registry CRUD, archive, submission, verification, and rejection;
- Articles, Categories, and Authors, including filtering, archive/restore, Site assignment, and publication request;
- media listing, upload, read, association, replacement, and archive;
- publishing request, job monitoring, target outcomes, attempts, links, and sanitized failures;
- platform-level customer administration for explicitly authorized Platform Administrators;
- Basic Analytics for Article, Site, Region, Category, Publisher, job, and outcome measures;
- Organization, Membership, Role, API Key, Subscription, Telegram mapping, and Site Settings administration;
- immutable, tenant-filtered Audit Log viewing.

Every CMS operation validates server-boundary input with Zod, invokes a shared Business Service, applies the Active Organization and required Permission, returns field-specific errors for invalid input, and preserves submitted tenant context for correction after sanitized failures. Lists, records, aggregates, and settings must never include another organization’s data.

## 9. Publisher registry and source attribution

Publisher Types are `government_institution`, `rutan_lapas`, `public_relations_office`, `company`, `organization`, `community`, and `independent_publisher`. Verification Status values are `unverified`, `pending`, `verified`, and `rejected`.

Publisher identity, type, attribution, contacts, and evidence are validated and organization-scoped. Submission records the actor and time; approval or rejection records the verifier, time, evidence reference, and sanitized reason where applicable. Changing verified identity or evidence requires a new verification decision.

Public articles show current Source Attribution and verification context. Independent publishers are identified as independent media. Institutional or official claims appear only when a verified Publisher has an active same-organization Official Affiliation for the relevant Site, named institution, evidence, and authorized claim scope. Publisher, verification, attribution, and affiliation changes require atomic before/after audit records.

## 10. Canonical article and filtering lifecycle

Authorized editors can create, read, update, archive, restore, filter, assign, and publish Articles. Article input and references are Zod-validated and checked within the Article’s Organization. Updates preserve Article ID and Organization and use conflict detection so stale writes do not silently overwrite newer state. Archive retains canonical content, attribution, and publication history.

Article Site assignment is set-based: one row per distinct same-organization Site. Any absent, inactive, unauthorized, or foreign Site rejects the complete assignment with no partial change. Article lifecycle and assignment changes require atomic audit records.

CMS filters can combine Region, Site, Category, Publisher, Author, publication state, and search within the Active Organization. Public selection requires an active `published` Article Site relation for the resolved Site. Regional subdomains additionally require the resolved Region. Inactive or archived Articles, Sites, Regions, or assignments are excluded. Empty valid results remain Site-branded and never fall back to another Site’s content.

## 11. Shared media workflow

Media lives in one private R2 bucket, with organization-scoped metadata in PostgreSQL. Required object-key prefixes are:

- `articles/{articleId}/` for Article media;
- `sites/{siteId}/` for Site media;
- `assets/` for general Organization assets.

Keys append a sanitized, collision-resistant filename component. Before issuing upload authorization, the service validates filename, media type, declared size, purpose, owner, Organization, and Permission; verifies Article/Site ownership; and atomically reserves an unused exact key. Occupied keys and existing metadata remain unchanged while another candidate is generated.

Upload authorization is short-lived and grants one intended operation on one exact key. Completion compares object metadata, media type, size, and checksum with the authorization before activating metadata. Rejected or orphaned objects become eligible for cleanup and never become active public media.

Public access requires an exact Hostname Context and either an active Site Settings reference or an Article published to the resolved Site. Unpublished, archived, rejected, unreferenced, cross-Site, and cross-organization requests are denied without exposing object metadata. No authorization grants bucket-list or prefix-wide access. Media mutations and access authorization are audited without signed URLs or credentials.

## 12. Asynchronous multi-site publication

### Request acceptance and idempotency

A publication request contains one Organization, Article, distinct target Sites, normalized options, and an Idempotency Key. The Business Service calculates a versioned Request Fingerprint from the Organization, Article, sorted distinct Site set, and normalized options.

The first valid request transactionally creates one Organization-scoped Publishing Job, one Article Site per distinct target, immutable job targets, initial `queued` states, and an Audit Log. Only after durable commit is the logical job dispatched to Upstash Redis.

Concurrent or repeated requests with the same Organization, Idempotency Key, and fingerprint return the same logical job. Reusing that Organization/key with another fingerprint returns a conflict without changing the original. The same key in another Organization is independent. Any invalid target rejects the entire initial request.

### States and transitions

Publishing State is exactly `queued`, `processing`, `published`, `failed`, or `retrying`.

Allowed Publishing Job transitions are:

- `queued -> processing | retrying | failed`;
- `processing -> published | retrying | failed`;
- `retrying -> processing | failed`;
- repeated `published -> published` and `failed -> failed` are idempotent.

Allowed Article Site transitions are:

- `queued -> processing`;
- `processing -> published | retrying | failed`;
- `retrying -> processing | failed`;
- repeated terminal transitions preserve existing outcomes.

All other transitions are rejected without state change. Target aggregation keeps a job processing while any target processes, retrying when no target processes and an incomplete retryable target remains, published when all targets publish, and failed when all targets are terminal with at least one failure.

### Dispatch, retry, and recovery

Upstash Redis is a queue/state accelerator, not the durable source of truth. If dispatch fails after database commit, the job records a retrying or failed dispatch outcome according to failure class. Reconciliation discovers durable queued/retrying jobs without confirmed dispatch and schedules the same logical ID without creating duplicate assignments.

Retry attempts and delays use bounded runtime configuration. Workers atomically claim jobs and targets with leases and fencing tokens; only the current owner can persist transitions. Stale workers cannot overwrite newer state. Retries preserve published outcomes and process only incomplete retryable targets. State and required audit records commit before acknowledgement.

A terminal Publication Result contains the persisted final state, count of published Sites, and exactly the stored URLs for successful Article Site outcomes. Failures retain sanitized diagnostics only.

## 13. Telegram and API behavior

Telegram authenticates the webhook source, validates bounded freshness, atomically claims replay identity, resolves an active Telegram Identity Mapping, and checks required Permissions before invoking tenant services. It supports Article fields, image submission, Region selection, Site selection, publication, status, and generated-link retrieval.

Telegram adapters use the same Zod schemas and Article, Media, and Publication Business Services as the CMS. Equivalent authorized inputs must produce equivalent persisted business outcomes; only transport presentation differs. Responses are concise and exclude secrets, temporary media URLs, and internal diagnostics.

API Keys are bound to one Organization, status, and explicit scopes. Plaintext is shown only once at successful issuance. Persistence stores only secure one-way verification material. Authentication verifies active status, scope, and ownership. Rotation atomically issues a replacement and revokes its predecessor; revocation blocks subsequent use. Credential-state changes and audits commit atomically.

Protected endpoint classes use bounded rate-limit policies. Authenticated identities include Organization and actor/key; unauthenticated identities use validated request-source identity. Excess requests return HTTP 429 with bounded retry guidance.

All webhooks validate source authenticity, freshness, and an atomic source-scoped replay claim before tenant processing. Concurrent duplicates produce one logical outcome.

## 14. Shared public news experience

Every configured public hostname uses one Public News Template and the resolved Site’s persisted settings: name, logo, favicon, colors, description, social links, SEO settings, navigation, and safe fallback assets.

Required public surfaces are:

- header and persisted navigation;
- homepage;
- article listing;
- article detail;
- Category pages;
- search;
- sidebar;
- footer;
- Site-branded HTTP 404 and sanitized error states.

The template renders only published content available to the resolved Site. Direct cross-Site or unpublished Article URLs return the resolved Site’s branded, non-indexable 404. Data-loading failures never display another Site’s content or internal diagnostics. Media reserves dimensions or aspect ratio before loading. All surfaces support mobile, tablet, and desktop classes without horizontal overflow, preserve readable text and operable navigation, and show visible keyboard focus.

Site Settings changes apply from persisted data without a Site-specific deployment.

## 15. SEO requirements

For indexable Site pages, output must derive from the exact Hostname Context and include:

- page title and description;
- absolute canonical URL;
- hostname-correct Open Graph URL, title, description, site name, type, and image;
- NewsArticle JSON-LD for published Articles;
- Breadcrumb JSON-LD for hierarchical pages;
- verified Organization and WebSite structured data;
- Site-specific `robots.txt` and sitemap location;
- Site-only `sitemap.xml`;
- Site-only RSS with hostname-correct channel and item URLs;
- absolute favicon, logo, Open Graph image, sitemap, and feed references.

Official institutional claims are excluded unless verified configuration supports them. Unknown hosts, pending activation, branded 404s, and sanitized errors are non-indexable and must not emit another Site’s canonical, feed, sitemap, or structured data. All untrusted content is escaped, and metadata, XML, RSS, and JSON-LD must be syntactically valid.

## 16. Hostname-aware caching

Every public cache identity includes the normalized resolved hostname and all applicable selection dimensions: Organization, Site, Region, locale, path, normalized query, preview state, content version, routing version, and authentication class. Requests differing in any applicable dimension must not share an identity; equivalent normalized requests must converge.

Missing Hostname Context or incomplete cache identity bypasses tenant caching. Cache hits are accepted only if embedded Organization, Site, hostname, and versions match the current context. Preview and authenticated content remain separate from anonymous public content. Redis cache coordination is namespaced by environment, Organization, and Site.

Article/publication, Site Settings, hostname/Region, Publisher/verification/affiliation, and public-media-reference changes invalidate every affected listing, detail, category, search, SEO, sitemap, RSS, and media surface. Failed targeted invalidation triggers a Site-scoped bypass or broader Site-safe purge and a sanitized operational record; unrelated Sites remain untouched.

## 17. Security, secrets, and audit requirements

Zod validates all untrusted server-boundary input before business mutation. Server credentials are imported only in server-side execution. Browser bundles exclude database credentials, privileged Supabase credentials, R2 and Upstash credentials, Telegram/webhook secrets, API-key hashes, and all server-only environment values.

Errors redact secrets, hashes, signed URLs, stack traces, raw vendor bodies, and cross-organization identifiers. Security-sensitive changes and their Audit Logs commit in the same PostgreSQL transaction; failure to append the required audit rolls back the change and prevents success acknowledgement.

Audit Logs are immutable and append-only. They identify actor type and identifier, Organization, entry point, action, target type and identifier where safe, outcome, request ID, timestamp, changed fields, and sanitized before/after values. They exclude plaintext secrets, credential hashes, signed URLs, temporary credentials, webhook signatures, and internal errors. Tenant users can query only the Active Organization’s logs. Denied cross-tenant attempts are recorded without disclosing the foreign target.

## 18. Runtime configuration and seeding

Runtime configuration validates hosts, Supabase, Cloudflare, Vercel, R2, Upstash, publishing, Telegram/webhooks, security, cache, SEO, media, retry, lease, and rate-limit values. Invalid or incomplete configuration fails closed and reports deterministic field/category errors without values or secrets.

The seed process validates all three configured test root hostnames and the three initial Region descriptors before mutation. It reconciles by stable key in one transaction, preserves stable IDs, updates non-identity attributes without duplication, reports created/updated/unchanged/failed counts, and rolls back the whole seed run on failure.

## 19. Quality and acceptance boundaries

Each Major Stage must pass deterministic, single-run checks for TypeScript typechecking, linting, Vitest unit/property/integration tests, and non-interactive Playwright end-to-end tests as applicable. Tenant behavior tests include same-organization success, absent-resource denial, cross-organization denial, and failure atomicity. Client-boundary changes include secret-exclusion checks.

High-value property tests cover context exclusivity, configuration redaction, hostname normalization and exact resolution, control-plane conflicts, tenant relation coherence, seed idempotency, RBAC, aggregates, verified claims, canonical Articles and assignments, public content selection, media keys/access, publication fingerprinting/idempotency/transitions/retries/results/fencing, CMS/Telegram equivalence, SEO, cache partitioning/invalidation, API keys, rate limits, replay claims, and audit atomicity. Failures report a sanitized property name, seed, and minimized counterexample.

Any detected cross-organization content, media, cache, credential, job, analytics, or audit access fails the relevant stage. A failed stage blocks all dependent work.

## 20. Required delivery sequence

No application implementation begins until both documentation artifacts are explicitly approved. After approval, work proceeds in this strict, quality-gated sequence:

1. **Major Stage 1:** single-application foundation, approved technology stack, Runtime Configuration, deployment contracts, and Quality Gate setup.
2. **Major Stage 2:** Drizzle schemas/migrations/seeding, Supabase Auth, tenant transactions, and RBAC.
3. **Major Stage 3:** shared Business Services, CMS modules, Publisher Registry, Article lifecycle/filtering, Basic Analytics, and Audit Logs.
4. **Major Stage 4:** private R2 media, Publishing Jobs, Upstash dispatch, idempotency, leases/fencing, bounded retries, and Publication Results.
5. **Major Stage 5:** Cloudflare/Vercel hostname activation, exact hostname resolution, shared public template, complete SEO, and hostname-aware caching/invalidation.
6. **Major Stage 6:** Telegram parity, API Key lifecycle, rate limits, replay defense, customer management, and subscriptions.
7. **Major Stage 7:** production-readiness validation across the three configured test root domains and Wonosobo, Magelang, and Semarang.

Every stage begins only after the preceding stage passes its complete Quality Gate. Any sequencing change requires prior reviewer approval and an Architecture Document update explaining the dependency rationale.

## 21. Deployment acceptance

Production promotion must validate Runtime Configuration, required schema and migrations, Cloudflare nameservers and DNS/wildcard/proxy/TLS settings, exact Vercel custom-domain associations, server secrets, Supabase Auth/database connectivity, private R2 connectivity, Upstash connectivity, cron security, and Telegram webhook configuration.

Promotion fails closed on any invalid result. Rollback returns the one Vercel project to the last schema-compatible application version while preserving Cloudflare nameserver authority and recoverable durable work.

## 22. Explicit exclusions

The MVP excludes:

- separate tenant applications, codebases, templates, databases, Supabase projects, Auth instances, R2 buckets, Redis resources, Vercel projects, or deployments;
- Vercel nameserver delegation, Vercel-managed DNS authority, or Vercel wildcard-domain registration;
- another primary database, authentication provider, ORM, object store, queue service, DNS provider, application host, CSS framework, component system, messaging platform, validation library, unit-test framework, or end-to-end framework;
- destination-specific copies of canonical Article content;
- a public R2 bucket, bucket listing, or authorization based only on object-key obscurity;
- public-site fallback to another organization, hostname, Site Settings record, asset, or content set;
- unbounded publication retries, long-running workers, or reliance on exactly-once cron/queue delivery;
- official institutional claims without current verified affiliation and claim scope;
- starting implementation before explicit approval of both required documents.

## 23. Reviewer approval and implementation-stage confirmations

The user/reviewer explicitly approved this PRD and `docs/ARCHITECTURE.md` through this session on 2026-08-30, satisfying the pre-code documentation gate. The following operational confirmations remain required at the applicable implementation or promotion stage:

1. operational acceptance of exact per-Site Vercel domain association while Cloudflare retains all nameserver and DNS authority;
2. Vercel plan capacity for projected exact-domain count, cron frequency, and function duration;
3. Cloudflare Universal SSL coverage for the one-label regional hostname convention and successful Full (strict) origin validation;
4. approved numeric bounds for retry schedules, leases, media size/type rules, upload/read authorization TTLs, rate limits, cache TTLs, worker batches, and webhook freshness/replay windows;
5. ownership and least-privilege scope of Cloudflare, Vercel, Supabase, R2, Upstash, Telegram, migration, and runtime credentials.
