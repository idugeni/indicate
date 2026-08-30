# Requirements Document

## Introduction

Indicate MVP is a multi-tenant media syndication and publishing platform operated from the central CMS at `indicate.web.id`. One shared deployment serves multiple Indonesian `.web.id` news domains and their regional subdomains. The CMS, APIs, background publication processing, and Telegram workflows use the same tenant-aware business services. The MVP starts with three configurable test root domains and the Wonosobo, Magelang, and Semarang regions while preserving an architecture that supports up to 100 root domains and all Central Java regions.

## Glossary

- **Indicate_Platform**: The complete multi-tenant media syndication and publishing product.
- **Deployment_Architecture**: The shared runtime and managed-resource topology used by the Indicate Platform.
- **Technology_Stack**: The exclusive set of primary frameworks, libraries, and managed services permitted for the MVP.
- **Runtime_Configuration**: Validated deployment-specific values that configure domains, limits, credentials, and operational behavior without source-code changes.
- **MVP_Seed_Process**: The repeatable database operation that reconciles configured MVP Root Domains and initial Regions.
- **Implementation_Plan**: The future ordered implementation work derived after requirements and design approval.
- **Next_Application**: The single Next.js App Router application written in TypeScript.
- **Vercel_Project**: The single Vercel project used only to host the Next Application.
- **Cloudflare_DNS**: The sole authority for nameservers, DNS records, wildcard DNS, SSL proxying, and CDN behavior for every managed hostname.
- **Supabase_Project**: The single Supabase project that provides the Supabase Database and Supabase Auth.
- **Supabase_Database**: The single shared Supabase PostgreSQL database.
- **Supabase_Auth**: The authentication capability in the Supabase Project.
- **Drizzle_ORM**: The required typed database schema, migration, and application query layer.
- **R2_Bucket**: The single shared Cloudflare R2 object-storage bucket.
- **Upstash_Redis**: The single shared Upstash Redis resource used for queues, idempotency coordination, rate limiting, and permitted cache coordination.
- **CMS**: The central, protected content-management interface served at `indicate.web.id`.
- **Business_Service**: Tenant-aware server-side application logic shared by CMS, API, background, and Telegram entry points.
- **Organization**: A tenant that owns or manages memberships, credentials, domains, sites, settings, content, and operational records.
- **Customer**: An Organization represented in platform-level customer and subscription administration.
- **Platform_Administrator**: An authenticated User with an explicit platform-level Permission to administer Customer Organizations across tenant boundaries.
- **User**: A person authenticated through Supabase Auth and uniquely linked to one Supabase Auth identity.
- **Membership**: The association between one User, one Organization, and one Role.
- **Active_Organization**: The Organization selected for the current authorized CMS operation.
- **Role**: An Organization-scoped authorization level that grants a defined set of Permissions.
- **Permission**: A named authorization capability for an Organization-scoped action.
- **RBAC**: Role-based access control enforced from Membership, Role, and Permission data.
- **Authorized_Actor**: An authenticated User, scoped API Key, or mapped Telegram identity permitted to perform an Organization action.
- **Tenant_Isolation**: Enforcement that limits every tenant-scoped read, mutation, job, object, cache entry, credential, metric, and audit event to the authorized Organization.
- **Non_Disclosing_Denial**: A denial with the same status and response shape for absent, cross-Organization, and unauthorized tenant resources.
- **Root_Domain**: An Organization-managed apex `.web.id` news hostname.
- **Region**: A geographic publishing area represented by a stable identifier, display name, and hostname-safe slug.
- **Central_Java_Region**: A regency or city in Central Java that can be configured as a Region.
- **Regional_Subdomain**: A hostname formed from a Region slug and Root Domain.
- **Site**: A publication destination defined by one Organization, one Root Domain, an optional Region context, a public hostname, and Site Settings.
- **Site_Settings**: The persisted site name, logo, favicon, colors, description, social links, SEO settings, and navigation for one Site.
- **Hostname_Normalization**: Conversion of a syntactically valid request hostname to a lowercase, port-free, trailing-dot-free ASCII lookup value.
- **Hostname_Context**: The active Root Domain, optional Region, Site, and Organization resolved by exact normalized-hostname match.
- **Control_Plane_Hostname**: The CMS hostname and each configured API or webhook hostname reserved for platform operations rather than public Site mapping.
- **Public_News_Template**: The shared responsive rendering experience for every Root Domain and Regional Subdomain.
- **Public_Surface**: A header, navigation, homepage, article listing, article detail, category page, search experience, sidebar, or footer rendered by the Public News Template.
- **Publisher**: An Organization-scoped editorial source in the Publisher Registry.
- **Publisher_Type**: One of `government_institution`, `rutan_lapas`, `public_relations_office`, `company`, `organization`, `community`, or `independent_publisher`.
- **Publisher_Verification_Status**: One of `unverified`, `pending`, `verified`, or `rejected`.
- **Publisher_Registry**: The CMS area that manages Publisher identity, type, attribution, and verification evidence.
- **Official_Affiliation**: Verified Publisher configuration that authorizes a Site or Article to claim official representation of an institution.
- **Source_Attribution**: Publisher identity and verification context displayed with an Article.
- **Article**: A canonical editorial content record owned by one Organization and associated with one Region.
- **Article_Site**: The same-Organization relationship assigning one Article to one Site and recording a destination Publishing State, timestamp, and URL.
- **Category**: An Organization-scoped editorial classification.
- **Author**: An Organization-scoped article byline identity.
- **Media_Asset**: An Organization-scoped metadata record for an object in the R2 Bucket.
- **Object_Key_Prefix**: One of `articles/{articleId}/`, `sites/{siteId}/`, or `assets/`, selected according to media purpose.
- **Structured_Object_Key**: An R2 object key that preserves its required Object Key Prefix and adds a collision-resistant filename component.
- **Upload_Authorization**: A time-bounded authorization restricted to one intended R2 operation and Structured Object Key.
- **Publishing_Job**: A durable record of one asynchronous multi-site publication request.
- **Publishing_State**: Exactly one of `queued`, `processing`, `published`, `failed`, or `retrying`.
- **Idempotency_Key**: A caller- or platform-generated value that identifies one logical publication request within one Organization.
- **Request_Fingerprint**: A deterministic comparison value for the Organization, Article, target Sites, and publication options in a request.
- **Retry_Policy**: Runtime Configuration containing a bounded attempt count and bounded delay schedule for retryable publication failures.
- **Publication_Result**: A response containing the final Publishing State, successful publication count, and successfully generated Site URLs.
- **Telegram_Bot**: The Telegram Bot API integration that invokes Business Services.
- **Telegram_Identity_Mapping**: An Organization-scoped association between a Telegram identity and an authorized platform identity, Role, or Permission set.
- **API_Key**: An Organization-scoped machine credential stored as a secure one-way hash after issuance.
- **Webhook_Request**: An inbound callback with source-authentication, freshness, and replay-protection data.
- **Webhook_Replay_Claim**: An atomic, source-scoped record that prevents more than one logical processing outcome for a webhook replay identifier.
- **Rate_Limit_Policy**: Runtime Configuration containing bounded request allowances and bounded windows for a protected endpoint class.
- **Subscription**: An Organization-scoped service-plan and status record.
- **Basic_Analytics**: Tenant-scoped aggregate content and publication metrics derived from Indicate Platform records.
- **Audit_Log**: An immutable, append-only application event containing actor, Organization, action, target, outcome, timestamp, and non-secret context.
- **Hostname_Aware_Cache**: A cache whose identity includes normalized hostname and every applicable content-selection dimension.
- **Basic_SEO**: Hostname-correct metadata, canonical URLs, Open Graph data, `robots.txt`, `sitemap.xml`, RSS, NewsArticle JSON-LD, Breadcrumb JSON-LD, and Organization and WebSite structured data.
- **Major_Stage**: One of the ordered implementation stages defined in Requirement 19.
- **Quality_Gate**: The required typecheck, lint, unit, integration, end-to-end, security-boundary, and property-based validation suite.
- **PRD**: The product requirements document required at `docs/PRD.md` before application implementation.
- **Architecture_Document**: The architecture document required at `docs/ARCHITECTURE.md` before application implementation.

## Requirements

### Requirement 1: Preserve the Single Shared Architecture

**User Story:** As a platform operator, I want one shared deployment architecture, so that the platform remains economical and operationally consistent as tenants grow.

#### Acceptance Criteria

1. THE Deployment_Architecture SHALL contain exactly one application codebase for all Organizations, Root Domains, Regional Subdomains, CMS workflows, APIs, background jobs, and Telegram workflows.
2. THE Deployment_Architecture SHALL contain exactly one Next Application.
3. THE Deployment_Architecture SHALL contain exactly one Vercel Project.
4. THE Deployment_Architecture SHALL contain exactly one Supabase Project.
5. THE Deployment_Architecture SHALL contain exactly one Supabase Database.
6. THE Deployment_Architecture SHALL use Supabase Auth from the same Supabase Project as the Supabase Database.
7. THE Deployment_Architecture SHALL use Drizzle ORM for application database access, schema definitions, and migrations.
8. THE Deployment_Architecture SHALL contain exactly one R2 Bucket shared by all Organizations.
9. THE Deployment_Architecture SHALL contain exactly one Upstash Redis resource shared by all Organizations.
10. THE Deployment_Architecture SHALL use one Public News Template for every Root Domain and Regional Subdomain.
11. WHEN an Organization, Root Domain, Site, or Region is added, THE Deployment_Architecture SHALL serve the addition through persisted data and Runtime Configuration without creating another application deployment.
12. THE Deployment_Architecture SHALL support up to 100 active Root Domains in the shared deployment.
13. THE Deployment_Architecture SHALL support all Central Java Regions under each configured Root Domain.
14. WHEN a shared resource operation occurs, THE Tenant_Isolation SHALL associate the operation with exactly one authorized Organization or an explicitly public Hostname Context.
15. IF an operation lacks an authorized Organization or valid public Hostname Context, THEN THE Indicate_Platform SHALL reject the operation before reading or changing tenant-scoped data.

### Requirement 2: Constrain the Technology Stack

**User Story:** As a maintainer, I want an explicit technology boundary, so that MVP implementation remains focused and supportable.

#### Acceptance Criteria

1. THE Technology_Stack SHALL contain Next.js App Router, TypeScript, Supabase PostgreSQL, Supabase Auth, Drizzle ORM, Tailwind CSS, shadcn/ui, Upstash Redis, Cloudflare R2, Telegram Bot API, Zod, Vitest, and Playwright as the complete primary technology and managed-service set.
2. THE Next_Application SHALL use Next.js App Router and TypeScript.
3. THE Next_Application SHALL use Tailwind CSS and shadcn/ui for the CMS and Public News Template user interfaces.
4. THE Indicate_Platform SHALL use Zod for server-boundary input validation.
5. THE Quality_Gate SHALL use Vitest for unit and integration tests.
6. THE Quality_Gate SHALL use Playwright for end-to-end tests.
7. WHEN an implementation dependency is proposed, THE Indicate_Platform SHALL accept the dependency only when the dependency supports a capability within the Technology Stack and does not introduce a replacement primary framework or managed service.
8. IF a proposed dependency introduces another database, authentication provider, ORM, object store, queue service, DNS provider, application host, CSS framework, component system, messaging platform, validation library, unit-test framework, or end-to-end framework, THEN THE Deployment_Architecture SHALL reject the dependency.
9. WHEN a managed infrastructure capability is required for the MVP, THE Deployment_Architecture SHALL provide the capability through the Technology Stack.
10. WHEN Runtime Configuration is incomplete or invalid at startup or deployment validation, THE Next_Application SHALL report the invalid configuration without exposing secret values.

### Requirement 3: Route and Resolve Hostnames Dynamically

**User Story:** As a platform operator, I want Cloudflare-controlled wildcard routing and exact dynamic hostname resolution, so that one deployment can safely serve every configured publication hostname.

#### Acceptance Criteria

1. THE Cloudflare_DNS SHALL remain the sole authoritative nameserver provider for every managed Root Domain and Regional Subdomain.
2. THE Cloudflare_DNS SHALL remain the sole authority for managed DNS records, wildcard DNS records, SSL proxying, and CDN behavior.
3. THE Deployment_Architecture SHALL keep every managed Root Domain's nameserver delegation at Cloudflare DNS.
4. THE Vercel_Project SHALL provide application hosting only.
5. THE Deployment_Architecture SHALL exclude Vercel nameserver delegation for every managed Root Domain.
6. THE Cloudflare_DNS SHALL route each configured apex Root Domain to the Vercel Project.
7. THE Cloudflare_DNS SHALL route each configured wildcard Regional Subdomain to the Vercel Project.
8. WHEN the Next Application receives a public request, THE Next_Application SHALL derive one Hostname Normalization value before Site lookup.
9. WHEN Hostname Normalization receives a syntactically valid hostname, THE Next_Application SHALL remove the request port, convert the hostname to lowercase ASCII, and remove a terminal DNS dot.
10. IF a request lacks a hostname or contains invalid hostname syntax, THEN THE Next_Application SHALL return an HTTP 400 response before tenant lookup.
11. WHEN a normalized hostname exactly matches an active Root Domain Site hostname, THE Next_Application SHALL resolve the corresponding Root Domain, Site, and Organization.
12. WHEN a normalized hostname exactly matches an active Regional Subdomain Site hostname, THE Next_Application SHALL resolve the corresponding Root Domain, Region, Site, and Organization.
13. THE Next_Application SHALL use exact normalized-hostname equality for persisted Site lookup.
14. IF a syntactically valid hostname has no exact active Site match, THEN THE Next_Application SHALL return an HTTP 404 response without selecting a fallback Organization.
15. IF a hostname matches a suffix or substring but not the complete normalized Site hostname, THEN THE Next_Application SHALL return an HTTP 404 response.
16. IF more than one active Site record resolves to the same normalized hostname, THEN THE Next_Application SHALL reject the configuration as invalid and return a non-indexable error response.
17. WHEN a Root Domain, Region, or Site hostname is added through valid configuration, THE Next_Application SHALL resolve the hostname without a source-code change.
18. WHEN a Site hostname is deactivated, THE Next_Application SHALL stop resolving the hostname to tenant content.
19. THE Hostname_Context SHALL be available to public content selection, URL generation, authorization boundaries, SEO generation, analytics attribution, and cache identity.
20. WHEN deployment configuration changes a managed hostname, THE Deployment_Architecture SHALL validate the Cloudflare DNS route, Vercel custom-domain association, SSL proxy behavior, and exact Site mapping before production activation.
21. THE Runtime_Configuration SHALL reserve `indicate.web.id` and every configured API or webhook hostname as Control Plane Hostnames.
22. IF a Root Domain, Site, wildcard mapping, or seed value conflicts with a Control Plane Hostname, THEN THE Indicate_Platform SHALL reject the configuration before activation.
23. WHEN a request resolves to a Control Plane Hostname, THE Next_Application SHALL route the request only to the configured CMS, API, or webhook surface for that hostname.

### Requirement 4: Provide the Multi-Tenant Data Model

**User Story:** As a platform maintainer, I want a complete relational data model, so that tenant, editorial, publication, customer, and accountability data have explicit ownership and enforceable relationships.

#### Acceptance Criteria

1. THE Supabase_Database SHALL contain entities for `users`, `organizations`, `memberships`, `roles`, `permissions`, `role_permissions`, `domains`, `regions`, `sites`, `publishers`, `official_affiliations`, `articles`, `article_sites`, `categories`, `authors`, `media`, `publishing_jobs`, `api_keys`, `subscriptions`, `telegram_identity_mappings`, and `audit_logs`.
2. THE Supabase_Database SHALL identify the owning Organization on every tenant-scoped entity.
3. THE Membership SHALL associate one User, one Organization, and one Role.
4. THE Supabase_Database SHALL enforce unique normalized Root Domain hostnames.
5. THE Supabase_Database SHALL enforce unique normalized public Site hostnames.
6. THE Supabase_Database SHALL associate each Site with exactly one Root Domain and one Organization.
7. WHEN a Site has a regional context, THE Supabase_Database SHALL associate the Site with exactly one Region.
8. THE Supabase_Database SHALL associate each Article with exactly one Organization and one Region.
9. THE Supabase_Database SHALL associate Articles with Sites through Article Site records.
10. THE Supabase_Database SHALL store canonical Article title, body, source, author, category, and Region data only in the Article entity.
11. THE Article_Site SHALL store destination-specific publication state, published URL, and publication timestamp without copying canonical Article content.
12. THE Supabase_Database SHALL enforce that an Article Site record references an Article and Site owned by the same Organization.
13. THE Supabase_Database SHALL enforce that an Article references a Publisher, Category, Author, or Media Asset only when the referenced record belongs to the Article's Organization.
14. THE Supabase_Database SHALL enforce that a Site references a Root Domain and Region valid for the Site's Organization.
15. THE Supabase_Database SHALL preserve referential integrity for every declared entity relationship.
16. WHEN a tenant-scoped relation is created or updated, THE Indicate_Platform SHALL include the authorized Organization identifier in every relation lookup and mutation predicate.
17. IF any referenced tenant record is absent, unauthorized, or owned by another Organization, THEN THE Indicate_Platform SHALL reject the complete mutation with a Non-Disclosing Denial.
18. IF any validation, authorization, uniqueness, or referential-integrity check fails during a multi-record database mutation, THEN THE Supabase_Database SHALL preserve the state that existed before that mutation.
19. WHEN concurrent mutations target the same unique tenant relationship, THE Supabase_Database SHALL preserve one valid relationship and return a deterministic conflict for incompatible requests.
20. THE Drizzle_ORM SHALL define the schema, constraints, indexes, and migrations for every required entity and relationship.
21. WHEN a migration fails, THE Deployment_Architecture SHALL report the failure and prevent application code that depends on the failed migration from becoming active.
22. THE Supabase_Database SHALL enforce one User record per Supabase Auth identity.
23. THE Supabase_Database SHALL enforce that every Membership references a User and Role valid for the Membership's Organization.
24. THE Supabase_Database SHALL enforce that every Role Permission relationship references a Role and Permission valid for the same Organization or an explicitly platform-scoped Permission.
25. THE Supabase_Database SHALL persist every Telegram Identity Mapping and Official Affiliation used for authorization or public claims.
26. THE Supabase_Database SHALL enforce that every Telegram Identity Mapping references a User, Role, and Organization that form an authorized same-Organization relationship.
27. THE Supabase_Database SHALL enforce that every Official Affiliation references a Publisher and Site owned by the same Organization.
28. THE Supabase_Database SHALL enforce that every Publishing Job references an Article and target Article Site records owned by the Publishing Job's Organization.
29. IF a Membership, Role Permission, Telegram Identity Mapping, Official Affiliation, or Publishing Job relation violates Organization coherence, THEN THE Supabase_Database SHALL reject the complete mutation without changing related records.

### Requirement 5: Seed Initial Operating Data and Preserve Regional Scale

**User Story:** As an MVP operator, I want representative configurable domains and regions, so that the platform can be validated before broader Central Java rollout.

#### Acceptance Criteria

1. THE Runtime_Configuration SHALL provide exactly three configurable test Root Domain hostnames for the MVP Seed Process.
2. THE MVP_Seed_Process SHALL exclude hardcoded production Root Domain hostnames.
3. WHEN the MVP Seed Process runs with valid Runtime Configuration, THE Supabase_Database SHALL create or reconcile the three configured test Root Domains.
4. WHEN the MVP Seed Process runs with valid Runtime Configuration, THE Supabase_Database SHALL create or reconcile Wonosobo, Magelang, and Semarang Regions.
5. WHEN the MVP Seed Process runs repeatedly with unchanged Runtime Configuration, THE Supabase_Database SHALL preserve one logical record and stable identifier for each seeded Root Domain and Region.
6. WHEN the MVP Seed Process runs after a non-identity seed attribute changes, THE Supabase_Database SHALL reconcile that attribute without duplicating the logical record.
7. IF the three test Root Domain values are absent, duplicated after normalization, or syntactically invalid, THEN THE MVP_Seed_Process SHALL fail before changing seed-managed data.
8. IF any seed mutation fails, THEN THE Supabase_Database SHALL preserve the complete pre-seed state for the current seed run.
9. WHEN a Central Java Region is configured with a unique identifier, name, and hostname-safe slug, THE Indicate_Platform SHALL support the Region without a source-code change.
10. WHEN all Central Java Regions are configured for a Root Domain, THE Deployment_Architecture SHALL support a Site for each configured Region within the shared deployment.
11. WHEN seed reconciliation completes, THE MVP_Seed_Process SHALL report created, updated, unchanged, and failed records without exposing credentials.

### Requirement 6: Authenticate Users and Enforce Tenant RBAC

**User Story:** As an Organization administrator, I want authenticated and role-limited access, so that tenant resources remain isolated across every entry point.

#### Acceptance Criteria

1. WHEN a User accesses a protected CMS route, THE CMS SHALL require a valid Supabase Auth session.
2. IF a protected CMS request lacks a valid Supabase Auth session, THEN THE CMS SHALL deny the request before loading Organization data.
3. WHEN an authenticated User selects an Active Organization, THE CMS SHALL verify an active Membership for that User and Organization.
4. WHEN a User requests an Organization resource, THE Indicate_Platform SHALL verify active Membership before returning the resource.
5. WHEN a User requests an Organization action, THE Indicate_Platform SHALL verify the Role's Permission for the action.
6. WHEN an API Key requests an Organization action, THE Indicate_Platform SHALL verify key status, scope, and Organization ownership.
7. WHEN a Telegram identity requests an Organization action, THE Indicate_Platform SHALL verify an active Telegram Identity Mapping and required Permission.
8. IF an actor lacks Organization access, THEN THE Indicate_Platform SHALL return a Non-Disclosing Denial.
9. IF an actor lacks a required Permission, THEN THE Indicate_Platform SHALL return a Non-Disclosing Denial.
10. IF a requested tenant resource does not exist, THEN THE Indicate_Platform SHALL use the same denial status and response shape used for unauthorized and cross-Organization resources.
11. WHEN a tenant-scoped database operation executes, THE Indicate_Platform SHALL apply the authorized Organization identifier to every read and mutation predicate.
12. WHEN a tenant-scoped background publication job executes, THE Business_Service SHALL re-validate Organization ownership for the Publishing Job, Article, target Sites, Article Site records, and referenced Media Assets.
13. THE Tenant_Isolation SHALL apply to CMS, Telegram Bot, API, background publication, media, cache, analytics, subscription, and audit operations.
14. WHEN an Organization administrator creates, changes, deactivates, or removes a Membership or Role assignment, THE Indicate_Platform SHALL record an Audit Log.
15. IF an authorization check fails, THEN THE Indicate_Platform SHALL preserve tenant data without mutation.
16. IF an authorization-sensitive mutation cannot append its required Audit Log, THEN THE Supabase_Database SHALL roll back that mutation.
17. WHEN the Active Organization changes, THE CMS SHALL discard tenant-scoped data from the previous Active Organization and re-evaluate Membership and Permissions.

### Requirement 7: Provide Complete Central CMS Operations

**User Story:** As an authorized operator, I want complete central management areas, so that I can operate all tenant publications from `indicate.web.id`.

#### Acceptance Criteria

1. WHEN a User opens the CMS, THE CMS SHALL serve the protected management interface from `indicate.web.id`.
2. THE CMS SHALL provide a dashboard area containing tenant-scoped content, publication, and operational summaries.
3. THE CMS SHALL provide a domains area for listing, creating, reading, updating, activating, and deactivating Root Domains.
4. THE CMS SHALL provide a regions area for listing, creating, reading, updating, activating, and deactivating Regions.
5. THE CMS SHALL provide a sites area for listing, creating, reading, updating, activating, and deactivating Sites.
6. THE CMS SHALL provide a publishers and sources area for listing, creating, reading, updating, verifying, rejecting, and archiving Publishers.
7. THE CMS SHALL provide an articles area for listing, creating, reading, updating, archiving, filtering, assigning Sites, and requesting publication.
8. THE CMS SHALL provide a media area for listing, uploading, reading, associating, and archiving Media Assets.
9. THE CMS SHALL provide a publishing area for requesting publication and monitoring Publishing Jobs and Article Site outcomes.
10. THE CMS SHALL provide a platform-scoped customers area for Platform Administrators to list, create, read, update, activate, and deactivate Customer Organizations and view Subscription status.
11. THE CMS SHALL provide a Basic Analytics area for tenant-scoped Article, Site, and publication aggregates.
12. THE CMS SHALL provide a settings area for Organization, Membership, Role, API Key, Subscription, Telegram mapping, and Site Settings management.
13. THE CMS SHALL provide an audit logs area for viewing and filtering immutable Audit Logs.
14. THE CMS SHALL provide Category and Author management within the articles area.
15. WHEN a tenant-scoped CMS area lists records, THE CMS SHALL return records owned by the Active Organization only.
16. WHEN a tenant-scoped CMS area reads or mutates one record, THE CMS SHALL apply the Active Organization identifier and required Permission.
17. WHEN an authorized User submits valid data for a CMS mutation, THE CMS SHALL invoke the corresponding Business Service.
18. IF CMS mutation input is invalid, THEN THE CMS SHALL return field-specific validation errors without changing persisted data.
19. IF a CMS operation targets another Organization's record, THEN THE CMS SHALL return a Non-Disclosing Denial without changing persisted data.
20. WHEN a CMS mutation succeeds, THE CMS SHALL return the resulting tenant-scoped record or operation result from the Business Service.
21. IF a CMS mutation fails after submission, THEN THE CMS SHALL display a sanitized failure outcome and preserve the submitted tenant context for correction.
22. WHEN the Active Organization changes, THE CMS SHALL reload dashboard, lists, settings, analytics, and authorization context for the new Active Organization.
23. WHEN an authorized User opens the dashboard, THE CMS SHALL display Active Organization totals for active Root Domains, active Sites, active and archived Articles, Publishing Jobs by Publishing State, successful and failed Article Site outcomes, and active Media Assets.
24. WHEN an authorized User opens Basic Analytics, THE CMS SHALL support Article counts grouped by configured date filter, Site, Region, Category, and Publisher.
25. WHEN an authorized User opens Basic Analytics, THE CMS SHALL support Publishing Job and Article Site outcome counts grouped by configured date filter, Site, Region, and Publishing State.
26. WHEN a dashboard or Basic Analytics measure is calculated, THE Indicate_Platform SHALL derive the measure only from records owned by the Active Organization.
27. WHEN no records match a dashboard or Basic Analytics measure, THE CMS SHALL return a zero value or empty series for that measure.
28. IF a dashboard or Basic Analytics query fails, THEN THE CMS SHALL return a sanitized failure without displaying partial unscoped measures.
29. WHEN a Platform Administrator accesses the customers area, THE CMS SHALL verify the platform-level customer-administration Permission before returning Customer data.
30. IF a User lacks the platform-level customer-administration Permission, THEN THE CMS SHALL deny access to the customers area without returning Customer data.
31. WHEN a Platform Administrator changes a Customer Organization or Subscription, THE Indicate_Platform SHALL append an Audit Log associated with the affected Organization and Platform Administrator.
32. IF a Customer Organization mutation fails validation, persistence, or required audit recording, THEN THE Supabase_Database SHALL preserve the Customer Organization state that existed before the mutation.

### Requirement 8: Manage the Verified Publisher Registry

**User Story:** As an Organization administrator, I want a verified publisher registry, so that every article has accurate source attribution and official-affiliation claims are controlled.

#### Acceptance Criteria

1. THE Publisher_Registry SHALL support Publisher Types for government institutions, Rutan/Lapas, public relations offices, companies, organizations, communities, and independent publishers.
2. THE Publisher_Registry SHALL support Publisher Verification Status values `unverified`, `pending`, `verified`, and `rejected`.
3. WHEN an authorized User creates a Publisher, THE Publisher_Registry SHALL store the Publisher under the Active Organization.
4. WHEN an authorized User creates or updates a Publisher, THE Publisher_Registry SHALL validate identity, Publisher Type, attribution label, contact fields, and submitted verification evidence with Zod.
5. WHEN an authorized User submits a Publisher for verification, THE Publisher_Registry SHALL record the `pending` status, submitting actor, and submission timestamp.
6. WHEN an authorized verifier approves a Publisher, THE Publisher_Registry SHALL record the `verified` status, verifying User, verification timestamp, and non-secret evidence reference.
7. WHEN an authorized verifier rejects a Publisher, THE Publisher_Registry SHALL record the `rejected` status, verifying User, verification timestamp, and sanitized reason.
8. WHEN Publisher verification evidence or identity changes after verification, THE Publisher_Registry SHALL require a new verification decision before presenting the changed identity as verified.
9. WHEN an Article references a Publisher, THE Indicate_Platform SHALL preserve the Publisher relationship as Source Attribution.
10. WHEN a public Article is rendered, THE Public_News_Template SHALL display Source Attribution consistent with the Publisher's current identity and verification status.
11. WHEN a Publisher has Publisher Type `independent_publisher`, THE Public_News_Template SHALL identify the Publisher as independent media.
12. WHEN an independent Publisher has an active Official Affiliation, THE Public_News_Template SHALL present only the institutional claim and claim scope authorized by the verified configuration.
13. IF an independent Publisher lacks an active Official Affiliation for an institution, THEN THE Indicate_Platform SHALL exclude claims that the Publisher or Site is the institution's official site.
14. WHEN an Official Affiliation is configured, THE Publisher_Registry SHALL require a verified Publisher, named institution, authorized claim scope, and active verification evidence.
15. IF a User references a Publisher from another Organization, THEN THE Publisher_Registry SHALL return a Non-Disclosing Denial.
16. IF Publisher input or verification evidence is invalid, THEN THE Publisher_Registry SHALL return field-specific validation errors without changing the Publisher.
17. WHEN a Publisher identity, type, verification status, attribution, or Official Affiliation changes, THE Indicate_Platform SHALL append an Audit Log containing before-and-after non-secret values.
18. IF the required Audit Log cannot be appended, THEN THE Supabase_Database SHALL roll back the Publisher mutation.

### Requirement 9: Manage Canonical Articles

**User Story:** As an editor, I want a tenant-safe article lifecycle, so that one canonical article can feed multiple publication sites without content duplication.

#### Acceptance Criteria

1. WHEN an authorized User creates an Article, THE CMS SHALL validate the Article input with Zod.
2. WHEN an authorized User creates an Article, THE Business_Service SHALL associate the Article with exactly one Organization and one Region.
3. WHEN Article input references a Publisher, Category, Author, or Media Asset, THE Business_Service SHALL verify that every referenced record belongs to the Article's Organization.
4. WHEN an authorized User reads an Article, THE CMS SHALL return the Article only within the Active Organization.
5. WHEN an authorized User updates an Article, THE Business_Service SHALL preserve the Article identifier and Organization ownership.
6. WHEN an authorized User archives an Article, THE Business_Service SHALL retain canonical content, Source Attribution, and publication history for authorized audit access.
7. WHEN an authorized User assigns Sites to an Article, THE Business_Service SHALL create or reconcile one Article Site record for each distinct same-Organization Site.
8. WHEN an Article is assigned to multiple Sites, THE Supabase_Database SHALL retain exactly one canonical Article content record.
9. WHEN an Article Site assignment changes, THE Business_Service SHALL preserve the canonical Article title and body without destination copies.
10. WHEN repeated assignment requests contain the same Article and Site, THE Business_Service SHALL preserve one Article Site relationship.
11. IF an assignment includes an absent, inactive, unauthorized, or cross-Organization Site, THEN THE Business_Service SHALL reject the complete assignment mutation with a Non-Disclosing Denial.
12. IF Article input is invalid, THEN THE CMS SHALL return field-specific validation errors without changing Article data.
13. IF a concurrent Article update is based on stale persisted state, THEN THE Business_Service SHALL return a conflict without silently overwriting the newer state.
14. WHEN an Article is created, updated, archived, restored, or assigned to Sites, THE Indicate_Platform SHALL append an Audit Log.
15. IF the required Audit Log cannot be appended, THEN THE Supabase_Database SHALL roll back the Article mutation.

### Requirement 10: Filter Content by Region and Site

**User Story:** As an editor or reader, I want region-aware and site-aware content selection, so that each publication displays only locally relevant published articles.

#### Acceptance Criteria

1. WHEN an authorized User filters Articles by Region, THE CMS SHALL return matching Articles from the Active Organization only.
2. WHEN an authorized User filters Articles by Site, THE CMS SHALL return Articles related through same-Organization Article Site records only.
3. WHEN an authorized User combines Region, Site, Category, Publisher, Author, publication state, or search filters, THE CMS SHALL apply every supplied filter within the Active Organization.
4. IF a filter references another Organization's Region, Site, Category, Publisher, or Author, THEN THE CMS SHALL return a Non-Disclosing Denial.
5. WHEN a public request resolves a Site, THE Public_News_Template SHALL select only Articles with a published Article Site record for that Site.
6. WHEN a public request resolves a Regional Subdomain, THE Public_News_Template SHALL select only published Articles associated with both the resolved Region and resolved Site.
7. WHEN a public request resolves a Root Domain Site, THE Public_News_Template SHALL apply the Root Domain Site's persisted content-selection settings.
8. WHEN a reader opens a Category page, THE Public_News_Template SHALL return only published Articles assigned to that Category and resolved Site.
9. WHEN a reader submits a search query, THE Public_News_Template SHALL search only published Articles available to the resolved Site.
10. IF an Article lacks a published Article Site record for the resolved Site, THEN THE Public_News_Template SHALL omit the Article from listings, categories, search, feeds, and direct public Article rendering.
11. IF an Article, Site, Region, or Article Site record is inactive or archived, THEN THE Public_News_Template SHALL exclude the affected Article from public selection.
12. WHEN no Articles match a valid public listing, category, or search request, THE Public_News_Template SHALL render a Site-branded empty result without exposing another Site's content.
13. WHEN content filters fail to execute, THE Public_News_Template SHALL return a sanitized error response without falling back to unscoped content.

### Requirement 11: Upload and Serve Shared-Bucket Media

**User Story:** As an editor, I want secure media workflows in one shared bucket, so that reusable publication assets preserve required key patterns without tenant collisions or unauthorized access.

#### Acceptance Criteria

1. WHEN an authorized User requests a media upload, THE Business_Service SHALL validate filename, media type, declared size, purpose, and intended owner with Zod.
2. WHEN an authorized User requests a media upload, THE Business_Service SHALL verify the Active Organization and required media Permission.
3. WHEN media belongs to an Article, THE Structured_Object_Key SHALL begin with `articles/{articleId}/`.
4. WHEN media belongs to a Site, THE Structured_Object_Key SHALL begin with `sites/{siteId}/`.
5. WHEN media is an Organization asset without an Article or Site owner, THE Structured_Object_Key SHALL begin with `assets/`.
6. THE Structured_Object_Key SHALL preserve the selected Object Key Prefix and append a collision-resistant filename component.
7. WHEN an Article or Site object key is generated, THE Business_Service SHALL verify that the referenced Article or Site belongs to the authorized Organization.
8. WHEN an `assets/` object key is generated, THE Business_Service SHALL associate the resulting Media Asset metadata with the authorized Organization.
9. WHEN the Indicate Platform generates an Upload Authorization, THE Upload_Authorization SHALL permit one intended operation on one Structured Object Key for a configured bounded validity period.
10. WHEN an upload completes, THE Business_Service SHALL verify uploaded object metadata before creating or activating the Media Asset record.
11. WHEN an upload completes successfully, THE Business_Service SHALL store Media Asset ownership, Structured Object Key, media type, size, checksum, purpose, and either the owning Article identifier, owning Site identifier, or Organization asset designation.
12. IF uploaded media violates configured bounded type or size policies, THEN THE Business_Service SHALL reject the upload with a field-specific error.
13. IF uploaded object metadata differs from authorized metadata, THEN THE Business_Service SHALL reject Media Asset activation and make the unaccepted object eligible for cleanup.
14. IF a requested object belongs to another Organization, THEN THE Business_Service SHALL return a Non-Disclosing Denial without issuing access authorization.
15. WHEN the Indicate Platform generates media access authorization, THE Upload_Authorization SHALL restrict access to the intended Structured Object Key and configured bounded validity period.
16. WHEN a Media Asset is uploaded, associated, replaced, archived, or access-authorized, THE Indicate_Platform SHALL append an Audit Log.
17. THE Audit_Log SHALL exclude signed URLs, temporary credentials, secret query parameters, and plaintext storage credentials.
18. IF the required Media Asset database mutation fails, THEN THE Business_Service SHALL avoid presenting the uploaded object as an active Media Asset.
19. IF the required Audit Log cannot be appended, THEN THE Supabase_Database SHALL roll back the Media Asset metadata mutation.
20. WHEN a Structured Object Key candidate is created, THE Business_Service SHALL reserve the candidate with an atomic create-if-absent condition before issuing Upload Authorization.
21. IF a Structured Object Key candidate already exists, THEN THE Business_Service SHALL generate and reserve a different collision-resistant candidate without changing the existing object or Media Asset metadata.
22. IF atomic key reservation fails, THEN THE Business_Service SHALL return a sanitized upload failure without issuing Upload Authorization for the unreserved key.
23. WHEN a public request retrieves a Site Settings Media Asset, THE Business_Service SHALL authorize retrieval only when the Hostname Context Site actively references that Media Asset.
24. WHEN a public request retrieves an Article Media Asset, THE Business_Service SHALL authorize retrieval only when the Article has a published Article Site record for the Hostname Context Site.
25. IF a public media request targets an unpublished, archived, rejected-upload, unreferenced, cross-Site, or cross-Organization Media Asset, THEN THE Business_Service SHALL deny public retrieval without exposing object metadata.
26. WHEN a Media Asset becomes inactive or loses its last public Site reference, THE Indicate_Platform SHALL invalidate affected public media authorization and cache entries.
27. WHEN public media retrieval is authorized, THE Business_Service SHALL restrict retrieval to the referenced Structured Object Key without granting bucket-list or prefix-wide access.

### Requirement 12: Publish to Multiple Sites Asynchronously

**User Story:** As an editor, I want concurrency-safe asynchronous multi-site publication, so that one article can reach many sites with idempotent requests, bounded retries, and observable outcomes.

#### Acceptance Criteria

1. WHEN an Authorized Actor requests publication to one or more Sites, THE Business_Service SHALL validate the Article, distinct target Sites, publication options, Organization, and Idempotency Key.
2. WHEN a publication request is valid, THE Business_Service SHALL calculate a Request Fingerprint from the Organization, Article, normalized target Site set, and publication options.
3. WHEN a publication request is first accepted, THE Business_Service SHALL create one logical Publishing Job scoped by Organization and Idempotency Key.
4. WHEN a publication request is first accepted, THE Business_Service SHALL persist one Article Site record for each distinct target Site before processing publication output.
5. WHEN a publication request is first accepted, THE Publishing_Job SHALL enter the `queued` Publishing State.
6. WHEN a publication request is first accepted, THE Article_Site SHALL enter the `queued` Publishing State for each target Site.
7. WHEN a Publishing Job and its target records are durable, THE Business_Service SHALL enqueue the logical Publishing Job in Upstash Redis.
8. WHEN concurrent requests use the same Organization, Idempotency Key, and Request Fingerprint, THE Business_Service SHALL return the same logical Publishing Job.
9. WHEN repeated requests use the same Organization, Idempotency Key, and Request Fingerprint, THE Business_Service SHALL preserve one Article Site relationship per target Site.
10. IF an Organization and Idempotency Key are reused with a different Request Fingerprint, THEN THE Business_Service SHALL return an idempotency conflict without changing the original Publishing Job.
11. WHEN two Organizations use the same Idempotency Key, THE Business_Service SHALL maintain separate logical Publishing Jobs.
12. IF any target Site is absent, inactive, unauthorized, or owned by another Organization, THEN THE Business_Service SHALL reject the complete initial publication request with a Non-Disclosing Denial.
13. IF initial Publishing Job or target persistence fails, THEN THE Supabase_Database SHALL preserve the state that existed before the publication request.
14. IF queue dispatch fails with a retryable outcome after Publishing Job persistence, THEN THE Publishing_Job SHALL transition from `queued` to `retrying`.
15. IF queue dispatch fails with a non-retryable outcome, THEN THE Publishing_Job SHALL transition from `queued` to `failed`.
16. WHEN publication dispatch reconciliation runs, THE Business_Service SHALL discover durable `queued` or `retrying` Publishing Jobs without a confirmed queue entry.
17. WHEN publication dispatch reconciliation finds a recoverable Publishing Job, THE Business_Service SHALL atomically enqueue that same logical Publishing Job without creating duplicate Article Site records.
18. IF dispatch reconciliation exhausts the configured Retry Policy, THEN THE Publishing_Job SHALL transition to `failed` and produce a Publication Result.
19. THE Retry_Policy SHALL contain a configured bounded attempt count and configured bounded delay schedule for queue dispatch and target publication retries.
20. WHEN a worker atomically claims a `queued` Publishing Job, THE Publishing_Job SHALL transition to `processing`.
21. WHEN a worker atomically claims a `retrying` Publishing Job, THE Publishing_Job SHALL transition to `processing`.
22. WHEN concurrent workers attempt to claim the same Publishing Job, THE Business_Service SHALL grant processing ownership to one worker at a time.
23. WHEN a worker starts a `queued` or `retrying` Article Site target, THE Article_Site SHALL transition to `processing`.
24. WHEN publication succeeds for an Article Site target, THE Article_Site SHALL transition from `processing` to `published`.
25. IF an Article Site target has a retryable failure with remaining Retry Policy attempts, THEN THE Article_Site SHALL transition from `processing` to `retrying`.
26. WHEN a worker claims a retrying Article Site target, THE Article_Site SHALL transition from `retrying` to `processing`.
27. IF an Article Site target has a non-retryable failure or exhausts the Retry Policy, THEN THE Article_Site SHALL transition from `processing` or `retrying` to `failed`.
28. WHEN at least one Article Site target is `processing`, THE Publishing_Job SHALL remain in or transition to `processing`.
29. WHEN no Article Site target is `processing` and at least one incomplete target is `retrying`, THE Publishing_Job SHALL transition from `processing` to `retrying`.
30. WHEN every Article Site target is `published`, THE Publishing_Job SHALL transition from `processing` to `published`.
31. WHEN every Article Site target is terminal and at least one Article Site target is `failed`, THE Publishing_Job SHALL transition from `processing` or `retrying` to `failed`.
32. THE Publishing_State SHALL permit Publishing Job transitions only from `queued` to `processing`, `retrying`, or `failed`; from `processing` to `published`, `retrying`, or `failed`; and from `retrying` to `processing` or `failed`.
33. THE Publishing_State SHALL permit Article Site transitions only from `queued` to `processing`; from `processing` to `published`, `retrying`, or `failed`; and from `retrying` to `processing` or `failed`.
34. WHEN a `published` transition is repeated, THE Business_Service SHALL preserve the existing `published` state and target outcome.
35. WHEN a `failed` transition is repeated, THE Business_Service SHALL preserve the existing `failed` state and target outcome.
36. IF a requested Publishing State transition is absent from the allowed transition relation, THEN THE Business_Service SHALL reject the transition without changing the current state.
37. WHEN a retry occurs, THE Business_Service SHALL preserve published Article Site outcomes and retry only incomplete retryable targets.
38. WHEN publication succeeds for a Site, THE Article_Site SHALL store the generated Site URL and publication timestamp.
39. WHEN publication fails for a Site, THE Article_Site SHALL preserve sanitized failure information without exposing secrets.
40. WHEN a Publishing Job reaches `published` or `failed`, THE Business_Service SHALL produce a Publication Result.
41. THE Publication_Result SHALL contain the final Publishing State.
42. THE Publication_Result SHALL contain the count of successfully published Sites.
43. THE Publication_Result SHALL contain the successfully generated Site URLs.
44. WHEN a Publishing State changes, THE Business_Service SHALL persist the current Publishing State in the Publishing Job or Article Site target before acknowledging the transition.
45. WHEN a Publishing Job state changes, THE Business_Service SHALL update the Organization-scoped job state in Upstash Redis.
46. WHEN a Publishing State changes, THE Indicate_Platform SHALL append an Audit Log.
47. IF a worker loses processing ownership, THEN THE Business_Service SHALL prevent that worker from overwriting a newer Publishing Job or Article Site state.
48. IF persistence of a state transition or required Audit Log fails, THEN THE Business_Service SHALL withhold transition acknowledgement and preserve a retryable record of the incomplete transition.

### Requirement 13: Reuse Business Services from Telegram

**User Story:** As an authorized publisher, I want complete Telegram publishing workflows, so that I can submit and publish regional articles without behavior diverging from the CMS.

#### Acceptance Criteria

1. WHEN the Telegram Bot receives a request, THE Telegram_Bot SHALL authenticate the Telegram request source before command processing.
2. WHEN a Telegram identity requests an Organization operation, THE Telegram_Bot SHALL resolve an active Telegram Identity Mapping.
3. WHEN a mapped Telegram identity starts article submission, THE Telegram_Bot SHALL invoke the same Article Business Service used by the CMS.
4. WHEN a mapped Telegram identity submits Article fields, THE Telegram_Bot SHALL apply the same Zod schema used by the CMS Business Service.
5. WHEN a mapped Telegram identity submits an image, THE Telegram_Bot SHALL invoke the same Media Asset Business Service and tenant authorization used by the CMS.
6. WHEN a mapped Telegram identity selects a Region, THE Telegram_Bot SHALL list and accept only active Regions available to the mapped Organization.
7. WHEN a mapped Telegram identity selects publication Sites, THE Telegram_Bot SHALL list and accept only active Sites available to the mapped Organization and selected Region context.
8. WHEN a mapped Telegram identity requests publication, THE Telegram_Bot SHALL invoke the same publication Business Service used by the CMS.
9. WHEN Telegram requests publication, THE Business_Service SHALL apply the same tenant authorization, Request Fingerprint, Idempotency Key, queue, Retry Policy, state-transition, and audit behavior used for CMS publication.
10. WHEN a mapped Telegram identity requests status, THE Telegram_Bot SHALL retrieve the Organization-scoped Publishing Job through the shared Business Service.
11. WHEN a mapped Telegram identity requests publication links, THE Telegram_Bot SHALL retrieve generated Site URLs through the shared Business Service.
12. WHEN publication processing has a current outcome, THE Telegram_Bot SHALL return a concise result containing Publishing State, successful publication count, and generated Site URLs.
13. WHEN the same authorized operation and input are submitted through CMS and Telegram, THE Business_Service SHALL produce equivalent persisted business outcomes.
14. IF a Telegram identity has no active Telegram Identity Mapping, THEN THE Telegram_Bot SHALL return a Non-Disclosing Denial before invoking a tenant Business Service.
15. IF a Telegram identity lacks a required Permission, THEN THE Telegram_Bot SHALL return a Non-Disclosing Denial.
16. IF article, image, Region, Site, or publication input is invalid, THEN THE Telegram_Bot SHALL return concise field or step guidance without changing persisted tenant data.
17. IF a Telegram update fails webhook authenticity, freshness, or replay validation, THEN THE Telegram_Bot SHALL reject the update before invoking a Business Service.
18. WHEN a Telegram operation changes tenant data, THE Indicate_Platform SHALL identify the mapped actor and Telegram entry point in the Audit Log.
19. THE Audit_Log SHALL exclude Telegram secrets, webhook credentials, temporary media URLs, and plaintext API credentials.

### Requirement 14: Render the Complete Shared Public News Experience

**User Story:** As a reader, I want a responsive, complete, and consistently branded news site, so that I can discover and read regional content on supported devices.

#### Acceptance Criteria

1. WHEN a reader opens a configured public hostname, THE Public_News_Template SHALL render Site Settings from the resolved Site only.
2. THE Site_Settings SHALL contain site name, logo, favicon, colors, description, social links, SEO settings, and navigation.
3. THE Public_News_Template SHALL provide a header surface.
4. THE Public_News_Template SHALL provide a navigation surface from Site Settings.
5. THE Public_News_Template SHALL provide a homepage surface.
6. THE Public_News_Template SHALL provide an article listing surface.
7. THE Public_News_Template SHALL provide an article detail surface.
8. THE Public_News_Template SHALL provide category surfaces.
9. THE Public_News_Template SHALL provide a search surface.
10. THE Public_News_Template SHALL provide a sidebar surface.
11. THE Public_News_Template SHALL provide a footer surface.
12. WHEN a reader opens a public homepage, THE Public_News_Template SHALL render published Article listings selected for the resolved Site.
13. WHEN a reader opens an article listing, THE Public_News_Template SHALL render only published Articles selected for the resolved Site and requested filters.
14. WHEN a reader opens a published Article URL, THE Public_News_Template SHALL render canonical Article content, Source Attribution, and Site-specific context.
15. WHEN a reader opens a Category URL, THE Public_News_Template SHALL render the Category and published Articles available to the resolved Site.
16. WHEN a reader submits a search query, THE Public_News_Template SHALL render matching published Articles available to the resolved Site.
17. WHEN an Article includes Media Assets, THE Public_News_Template SHALL reserve media dimensions or aspect ratio before media loading.
18. THE Public_News_Template SHALL adapt every Public Surface at mobile, tablet, and desktop viewport classes without horizontal content overflow.
19. THE Public_News_Template SHALL preserve readable text, operable navigation, and visible focus indicators at mobile, tablet, and desktop viewport classes.
20. IF a valid URL has no public content for a recognized Site, THEN THE Public_News_Template SHALL render an HTTP 404 response using that Site's name, logo, colors, navigation, and footer.
21. IF a direct Article URL belongs to another Site or lacks a published Article Site record for the resolved Site, THEN THE Public_News_Template SHALL render the resolved Site's branded HTTP 404 response.
22. IF public data loading fails, THEN THE Public_News_Template SHALL render a sanitized Site-branded error response without exposing another Site's content or internal diagnostics.
23. WHEN Site Settings change, THE Public_News_Template SHALL apply the persisted change without a Site-specific code deployment.
24. IF a Site Setting asset is unavailable, THEN THE Public_News_Template SHALL render a configured Site-safe fallback without selecting another Site's asset.

### Requirement 15: Provide Complete Hostname-Correct SEO

**User Story:** As a site operator, I want complete hostname-correct SEO output, so that search engines and feed readers discover and attribute each publication correctly.

#### Acceptance Criteria

1. WHEN the Public News Template renders an indexable page, THE Next_Application SHALL emit a page title and description derived from the resolved Site and page content.
2. WHEN the Public News Template renders an indexable page, THE Next_Application SHALL emit an absolute canonical URL using the resolved Site hostname and canonical path.
3. WHEN the Public News Template renders an indexable page, THE Next_Application SHALL emit hostname-correct Open Graph URL, title, description, site name, type, and image data derived from the page image or configured Site fallback image.
4. WHEN the Public News Template renders a published Article, THE Next_Application SHALL emit NewsArticle JSON-LD using canonical Article, Source Attribution, publication, image, and resolved Site data.
5. WHEN the Public News Template renders a hierarchical page, THE Next_Application SHALL emit Breadcrumb JSON-LD whose URLs use the resolved Site hostname.
6. WHEN the Public News Template renders a Site page, THE Next_Application SHALL emit Organization structured data from verified Site and Publisher configuration.
7. WHEN the Public News Template renders a Site page, THE Next_Application SHALL emit WebSite structured data using the resolved Site hostname and Site Settings.
8. IF verified configuration does not support an official institutional claim, THEN THE Next_Application SHALL exclude that claim from metadata and structured data.
9. WHEN a crawler requests `/robots.txt` on an active Site, THE Next_Application SHALL return that Site's configured robots directives and hostname-correct sitemap location.
10. WHEN a crawler requests `/sitemap.xml` on an active Site, THE Next_Application SHALL return indexable URLs belonging only to that Site.
11. WHEN a feed reader requests the Site RSS endpoint, THE Next_Application SHALL return only published Articles available to that Site with hostname-correct item and channel URLs.
12. WHEN a Site page references a favicon, logo, Open Graph image, sitemap, or RSS feed, THE Next_Application SHALL emit an absolute URL for the resolved Site context.
13. WHEN an Article is unavailable to the resolved Site, THE Next_Application SHALL exclude the Article URL from that Site's sitemap and RSS output.
14. IF a request hostname has no active Site mapping, THEN THE Next_Application SHALL emit a non-indexable response without canonical, sitemap, RSS, or structured-data references to another Site.
15. IF a recognized Site page is a branded HTTP 404 or sanitized error response, THEN THE Next_Application SHALL emit a non-indexable robots directive.
16. WHEN Site Settings or public Article publication changes, THE Indicate_Platform SHALL invalidate affected SEO, sitemap, and RSS cache entries for that Site.
17. WHEN SEO output is generated, THE Next_Application SHALL escape untrusted content and produce syntactically valid metadata, XML, RSS, and JSON-LD for the requested format.

### Requirement 16: Make Caching Hostname-Aware

**User Story:** As a platform operator, I want complete cache partitioning and invalidation, so that shared infrastructure cannot serve content or settings across tenant hostnames.

#### Acceptance Criteria

1. WHEN the Next Application caches a public response, THE Hostname_Aware_Cache SHALL include the normalized resolved hostname in the cache identity.
2. WHEN content selection depends on Site, Region, locale, path, normalized query, preview state, content version, or authentication state, THE Hostname_Aware_Cache SHALL include every applicable dimension in the cache identity.
3. WHEN two cacheable requests differ by normalized hostname, THE Hostname_Aware_Cache SHALL produce distinct cache identities.
4. WHEN two cacheable requests differ by any applicable content-selection dimension, THE Hostname_Aware_Cache SHALL produce distinct cache identities.
5. IF a request lacks a valid Hostname Context, THEN THE Indicate_Platform SHALL bypass tenant content caches.
6. IF cache identity construction lacks the resolved normalized hostname, THEN THE Indicate_Platform SHALL bypass caching for that response.
7. WHEN cached content is returned, THE Next_Application SHALL verify that the cache partition matches the current Hostname Context.
8. IF a cached entry's tenant or Site context does not match the current Hostname Context, THEN THE Next_Application SHALL discard the entry and load scoped content.
9. WHEN an Article or Article Site publication changes, THE Indicate_Platform SHALL invalidate affected listing, detail, category, search, SEO, sitemap, and RSS entries for each affected Site.
10. WHEN Site Settings change, THE Indicate_Platform SHALL invalidate affected Public Surfaces and SEO entries for that Site.
11. WHEN a Site hostname, Root Domain, or Region mapping changes, THE Indicate_Platform SHALL invalidate entries for both previous and current Hostname Context values.
12. WHEN a Publisher identity, verification status, Source Attribution, or Official Affiliation changes, THE Indicate_Platform SHALL invalidate affected public Article and structured-data entries.
13. WHEN targeted invalidation fails, THE Indicate_Platform SHALL mark affected cache partitions for bypass or broader Site-scoped invalidation and record a sanitized operational failure.
14. THE Hostname_Aware_Cache SHALL namespace Upstash Redis cache-coordination data by Organization and Site where tenant-scoped coordination is used.
15. WHEN preview content is cached, THE Hostname_Aware_Cache SHALL keep preview entries separate from public entries.

### Requirement 17: Secure APIs, Secrets, Webhooks, and Inputs

**User Story:** As a security owner, I want layered tenant-aware controls, so that shared infrastructure can accept API and webhook traffic without exposing credentials or cross-tenant data.

#### Acceptance Criteria

1. WHEN the Indicate Platform receives untrusted application input, THE Indicate_Platform SHALL validate the input with Zod at the server boundary before business processing.
2. WHEN an Authorized Actor creates an API Key, THE Business_Service SHALL bind the API Key to one Organization, defined scopes, status, and non-secret identifier metadata.
3. WHEN the Indicate Platform issues an API Key, THE Business_Service SHALL display the plaintext API Key only in the successful issuance response.
4. WHEN the Indicate Platform persists an API Key, THE Business_Service SHALL store a secure one-way hash instead of the plaintext credential.
5. WHEN an API client authenticates with an API Key, THE Business_Service SHALL compare the presented credential with the stored hash and verify active status.
6. WHEN an API client invokes a tenant operation, THE Business_Service SHALL enforce API Key scope and Organization ownership.
7. WHEN an Authorized Actor rotates an API Key, THE Business_Service SHALL issue a new credential and revoke the superseded credential as one logical operation.
8. WHEN an Authorized Actor revokes an API Key, THE Business_Service SHALL reject subsequent authentication with that credential.
9. IF API Key issuance, rotation, or revocation cannot append its required Audit Log, THEN THE Supabase_Database SHALL roll back the credential-state mutation.
10. WHEN a protected endpoint receives a request, THE Indicate_Platform SHALL apply the configured Rate Limit Policy for that endpoint class.
11. THE Rate_Limit_Policy SHALL contain configured bounded request allowances and configured bounded windows.
12. WHEN a tenant-authenticated request is rate-limited, THE Indicate_Platform SHALL include the Organization and authenticated actor or key in the rate-limit identity.
13. WHEN an unauthenticated request is rate-limited, THE Indicate_Platform SHALL use the validated network or request-source identity configured for the endpoint class.
14. IF a Rate Limit Policy is exceeded, THEN THE Indicate_Platform SHALL return an HTTP 429 response with bounded retry guidance.
15. WHEN a Webhook Request arrives, THE Indicate_Platform SHALL validate source authenticity before processing the payload.
16. WHEN a Webhook Request arrives, THE Indicate_Platform SHALL validate request freshness against a configured bounded acceptance window.
17. WHEN a Webhook Request passes authenticity and freshness validation, THE Indicate_Platform SHALL atomically create one Webhook Replay Claim scoped by authenticated webhook source and replay identifier before processing tenant data.
18. THE Webhook_Replay_Claim SHALL remain effective for at least the configured webhook freshness acceptance window.
19. WHEN concurrent or repeated Webhook Requests use the same authenticated source and replay identifier, THE Indicate_Platform SHALL preserve one logical processing outcome.
20. IF Webhook Request authenticity, freshness, or replay validation fails, THEN THE Indicate_Platform SHALL reject the request before changing tenant data.
21. WHEN server credentials are required, THE Next_Application SHALL access the credentials only in server-side execution contexts.
22. WHEN the Next Application creates a client bundle, THE Next_Application SHALL exclude database credentials, privileged Supabase credentials, R2 credentials, Upstash credentials, Telegram secrets, webhook secrets, API Key hashes, and server-only environment values.
23. WHEN the Indicate Platform returns an error, THE Indicate_Platform SHALL redact secrets, credential hashes, signed URLs, internal stack traces, and cross-Organization identifiers.
24. WHEN a security-sensitive action occurs, THE Indicate_Platform SHALL append an Audit Log without plaintext secrets.
25. IF input validation fails, THEN THE Indicate_Platform SHALL return a deterministic field or request error without invoking the protected Business Service mutation.

### Requirement 18: Provide Immutable Tenant-Scoped Auditing and Operational Visibility

**User Story:** As an Organization administrator, I want immutable attributable records and sanitized operational status, so that I can review material changes and publication outcomes safely.

#### Acceptance Criteria

1. WHEN an authenticated actor performs a create, update, archive, restore, verification, credential, authorization, media, settings, customer, subscription, or publication action, THE Indicate_Platform SHALL append an Audit Log.
2. WHEN a protected operation is denied for authorization, THE Indicate_Platform SHALL append a security Audit Log without revealing the targeted cross-Organization resource to the requesting actor.
3. THE Audit_Log SHALL identify actor type and actor identifier.
4. THE Audit_Log SHALL identify Organization, action, target type, target identifier, outcome, and timestamp.
5. WHEN an Audit Log contains change context, THE Audit_Log SHALL contain changed field names and sanitized non-secret before-and-after values.
6. THE Audit_Log SHALL exclude plaintext secrets, credential hashes, signed URLs, temporary access credentials, webhook signatures, and unredacted internal errors.
7. THE Supabase_Database SHALL treat Audit Logs as append-only application records.
8. IF an application actor requests an Audit Log update or deletion, THEN THE Indicate_Platform SHALL reject the mutation.
9. WHEN an authorized User views Audit Logs, THE CMS SHALL return records for the Active Organization only.
10. IF an authorized User requests another Organization's Audit Log, THEN THE CMS SHALL return a Non-Disclosing Denial.
11. WHEN an authorized User filters Audit Logs, THE CMS SHALL apply actor, action, target, outcome, and configured date filters within the Active Organization.
12. WHEN an authorized User views a Publishing Job, THE CMS SHALL display current Publishing State, attempt count, target count, successful count, generated URLs, and sanitized failure information.
13. IF a background publication failure occurs, THEN THE Indicate_Platform SHALL preserve sanitized diagnostic context for authorized review.
14. WHEN Basic Analytics are calculated, THE Indicate_Platform SHALL aggregate records from the Active Organization only.
15. IF an analytics query cannot preserve Organization scope, THEN THE Indicate_Platform SHALL reject the query instead of returning unscoped aggregates.
16. IF a required Audit Log belongs to the same database mutation as a security-sensitive tenant change, THEN THE Supabase_Database SHALL commit the change and Audit Log atomically.
17. IF an operational event cannot be recorded in an Audit Log because the database is unavailable, THEN THE Indicate_Platform SHALL return a sanitized failure and avoid acknowledging a security-sensitive mutation as successful.

### Requirement 19: Follow the Mandated Pre-Implementation Work and Implementation Order

**User Story:** As a delivery owner, I want an explicit documentation and implementation sequence, so that architecture, deployment, security, and quality decisions precede dependent code.

#### Acceptance Criteria

1. WHEN implementation planning begins, THE Indicate_Platform SHALL create the PRD at `docs/PRD.md` before creating application code.
2. WHEN implementation planning begins, THE Indicate_Platform SHALL create the Architecture Document at `docs/ARCHITECTURE.md` before creating application code.
3. THE PRD SHALL preserve the approved product scope, tenant model, public surfaces, CMS areas, Telegram workflows, SEO scope, and scale targets from this requirements document.
4. THE Architecture_Document SHALL define tenant boundaries, same-Organization relational constraints, shared-resource isolation, hostname resolution, media key patterns, publication state transitions, idempotency, retries, cache partitioning, audit atomicity, and failure recovery.
5. THE Architecture_Document SHALL define Cloudflare as the sole nameserver, DNS-record, wildcard, SSL-proxy, and CDN authority and Vercel as application hosting only.
6. THE Architecture_Document SHALL define deployment Runtime Configuration, secret ownership, environment validation, database migration procedure, Cloudflare DNS configuration, Vercel custom-domain configuration, wildcard routing, and rollback behavior.
7. WHEN the PRD and Architecture Document are approved, THE Indicate_Platform SHALL implement Major Stage 1: project foundation, Technology Stack configuration, Runtime Configuration contracts, deployment configuration, and Quality Gate setup.
8. WHEN Major Stage 1 passes its Quality Gate, THE Indicate_Platform SHALL implement Major Stage 2: Drizzle schema, migrations, seed reconciliation, Supabase Auth integration, Tenant Isolation, and RBAC.
9. WHEN Major Stage 2 passes its Quality Gate, THE Indicate_Platform SHALL implement Major Stage 3: shared Business Services, CMS areas, Publisher Registry, Article lifecycle, regional filtering, Basic Analytics, and Audit Logs.
10. WHEN Major Stage 3 passes its Quality Gate, THE Indicate_Platform SHALL implement Major Stage 4: R2 media workflows, Publishing Jobs, Upstash queue behavior, concurrency-safe idempotency, bounded retries, and Publication Results.
11. WHEN Major Stage 4 passes its Quality Gate, THE Indicate_Platform SHALL implement Major Stage 5: Cloudflare and Vercel hostname deployment, exact hostname resolution, Public News Template, complete Basic SEO, and Hostname-Aware Cache behavior.
12. WHEN Major Stage 5 passes its Quality Gate, THE Indicate_Platform SHALL implement Major Stage 6: Telegram Bot workflows, API Key lifecycle, Rate Limit Policies, webhook replay defense, Customer management, and Subscription management.
13. WHEN Major Stage 6 passes its Quality Gate, THE Indicate_Platform SHALL implement Major Stage 7: production-readiness validation across the three configured test Root Domains and Wonosobo, Magelang, and Semarang Regions.
14. IF a Major Stage Quality Gate fails, THEN THE Indicate_Platform SHALL resolve the failure before beginning the next Major Stage.
15. WHEN implementation sequencing changes, THE Architecture_Document SHALL record the approved dependency rationale before affected application code changes.
16. IF a proposed implementation step depends on an incomplete prior Major Stage, THEN THE Implementation_Plan SHALL defer that step until the dependency passes its Quality Gate.
17. WHEN production deployment is prepared, THE Deployment_Architecture SHALL validate Runtime Configuration, migrations, Cloudflare records, wildcard routing, Vercel custom domains, server secrets, Supabase connectivity, R2 connectivity, Upstash connectivity, and Telegram webhook configuration.
18. IF production deployment validation fails, THEN THE Deployment_Architecture SHALL prevent promotion of the invalid release.

### Requirement 20: Enforce Complete Quality Gates

**User Story:** As a delivery owner, I want repeatable verification after every major stage, so that regressions, tenant leaks, and deployment errors are detected before dependent work begins.

#### Acceptance Criteria

1. WHEN a Major Stage is completed, THE Quality_Gate SHALL run TypeScript type checking.
2. WHEN a Major Stage is completed, THE Quality_Gate SHALL run lint checks.
3. WHEN a Major Stage is completed, THE Quality_Gate SHALL run Vitest unit tests in single-run mode.
4. WHEN a Major Stage is completed, THE Quality_Gate SHALL run integration tests in single-run mode.
5. WHEN a Major Stage is completed, THE Quality_Gate SHALL run Playwright end-to-end tests in single-run mode.
6. WHEN a Major Stage changes tenant-scoped behavior, THE Quality_Gate SHALL test same-Organization success, cross-Organization denial, absent-resource denial, and mutation failure atomicity.
7. WHEN a Major Stage changes server or client boundaries, THE Quality_Gate SHALL verify that client output excludes server secrets and privileged credentials.
8. WHEN a Quality Gate check completes, THE Quality_Gate SHALL produce a deterministic pass or fail result suitable for continuous integration.
9. IF any required Quality Gate check fails, THEN THE Quality_Gate SHALL mark the Major Stage as failed.
10. WHEN Major Stage 1 is validated, THE Quality_Gate SHALL verify Technology Stack boundaries, Runtime Configuration validation, deployment checks, and single-resource invariants.
11. WHEN Major Stage 2 is validated, THE Quality_Gate SHALL verify schema constraints, migration behavior, idempotent seeding, unique Supabase Auth identity linkage, authentication, Membership, RBAC, persisted trust relationships, and Tenant Isolation.
12. WHEN Major Stage 3 is validated, THE Quality_Gate SHALL verify every required CMS area, platform-scoped Customer authorization, dashboard and Basic Analytics measures, Publisher Type and verification behavior, Source Attribution, canonical Article preservation, filtering, and immutable Audit Logs.
13. WHEN Major Stage 4 is validated, THE Quality_Gate SHALL verify required R2 key prefixes, atomic object-key collision handling, tenant-authorized and public Hostname Context media access, concurrent publication idempotency, queue dispatch recovery, bounded retries, the complete Publishing State transition relation, target-to-job state aggregation, publication counts, and generated URL responses.
14. WHEN Major Stage 5 is validated, THE Quality_Gate SHALL verify Cloudflare authority, reserved Control Plane Hostnames, exact hostname resolution, invalid and unknown hostname behavior, tenant-separated caching, invalidation, all Public Surfaces, responsive rendering, branded HTTP 404 behavior, and complete hostname-correct SEO.
15. WHEN Major Stage 6 is validated, THE Quality_Gate SHALL verify Telegram authentication, article and image submission, Region and Site selection, publication, status, link retrieval, API Key lifecycle, rate limiting, atomic webhook replay defense, and CMS-Telegram Business Service equivalence.
16. WHEN Major Stage 7 is validated, THE Quality_Gate SHALL verify the three configured test Root Domains across Wonosobo, Magelang, and Semarang publication flows.
17. WHEN Major Stage 7 is validated, THE Quality_Gate SHALL verify that no test Root Domain is hardcoded in source code.
18. WHEN Major Stage 7 is validated, THE Quality_Gate SHALL verify deployment configuration and rollback procedures without transferring nameserver authority from Cloudflare DNS.
19. IF a test detects cross-Organization content, media, cache, analytics, credential, job, or audit access, THEN THE Quality_Gate SHALL fail the Major Stage.
20. IF a test command would enter watch or interactive mode, THEN THE Quality_Gate SHALL use its supported single-execution mode.

### Requirement 21: Verify Executable Correctness Properties

**User Story:** As a maintainer, I want executable property-based tests for high-value invariants, so that shared-platform behavior remains correct across generated inputs and concurrency cases.

#### Acceptance Criteria

1. WHEN the Quality Gate tests canonical Article persistence with generated valid Article inputs, THE Quality_Gate SHALL verify that create-then-read returns an equivalent canonical Article in the same Organization.
2. WHEN the Quality Gate tests Article updates with generated valid changes, THE Quality_Gate SHALL verify that Article identifier and Organization ownership remain invariant.
3. WHEN the Quality Gate tests Article Site assignment with generated duplicate Site inputs, THE Quality_Gate SHALL verify one Article Site relationship per distinct same-Organization Site.
4. WHEN the Quality Gate tests multi-Site assignment with generated valid Sites, THE Quality_Gate SHALL verify that the Supabase Database preserves exactly one canonical Article content record.
5. WHEN the Quality Gate tests cross-Organization Article relations with generated tenant pairs, THE Quality_Gate SHALL verify a Non-Disclosing Denial and unchanged database state.
6. WHEN the Quality Gate tests Hostname Normalization with generated equivalent hostname spellings, THE Quality_Gate SHALL verify one identical normalized lookup value.
7. WHEN the Quality Gate tests hostname lookup with generated non-equal suffix, prefix, and substring hostnames, THE Quality_Gate SHALL verify that no configured Site is selected.
8. WHEN the Quality Gate tests canonical URL generation with generated active Hostname Context values, THE Quality_Gate SHALL verify that each generated URL preserves the resolved normalized hostname.
9. WHEN the Quality Gate tests Structured Object Keys with generated Article identifiers, Site identifiers, asset names, and filenames, THE Quality_Gate SHALL verify the required Object Key Prefix and collision-safe suffix.
10. WHEN the Quality Gate tests media authorization with generated cross-Organization object requests, THE Quality_Gate SHALL verify denial without issuance of Upload Authorization.
11. WHEN the Quality Gate tests publication idempotency with generated concurrent requests sharing Organization, Idempotency Key, and Request Fingerprint, THE Quality_Gate SHALL verify one logical Publishing Job and one Article Site relationship per target Site.
12. WHEN the Quality Gate tests publication idempotency with generated requests that reuse Organization and Idempotency Key with different Request Fingerprints, THE Quality_Gate SHALL verify a conflict and unchanged original Publishing Job.
13. WHEN the Quality Gate tests identical Idempotency Keys across generated distinct Organizations, THE Quality_Gate SHALL verify separate tenant-scoped Publishing Jobs.
14. WHEN the Quality Gate tests Publishing State transitions with generated valid transition sequences, THE Quality_Gate SHALL verify the complete allowed Publishing Job and Article Site transition relations and target-to-job aggregation rules.
15. WHEN the Quality Gate tests generated invalid Publishing State transitions, THE Quality_Gate SHALL verify rejection without changing the current state.
16. WHEN the Quality Gate tests repeated terminal Publishing State transitions, THE Quality_Gate SHALL verify idempotent preservation of the terminal state and target outcomes.
17. WHEN the Quality Gate tests retry processing with generated retryable target failures, THE Quality_Gate SHALL verify that attempts and delays remain within the configured Retry Policy bounds.
18. WHEN the Quality Gate tests partial publication success with generated target outcomes, THE Quality_Gate SHALL verify that the Publication Result count equals the number of successful Article Site records and that the Publication Result URL set equals the generated URL set from successful Article Site records.
19. WHEN the Quality Gate tests cache identities with generated requests that differ by normalized hostname or an applicable content-selection dimension, THE Quality_Gate SHALL verify distinct cache identities.
20. WHEN the Quality Gate tests cache identities with generated equivalent normalized requests, THE Quality_Gate SHALL verify identical cache identities.
21. WHEN the Quality Gate tests RBAC with generated Users, Memberships, Roles, Permissions, Organizations, and resources, THE Quality_Gate SHALL verify success only for matching authorized combinations and unchanged data for denied combinations.
22. WHEN the Quality Gate tests Audit Logs with generated tenant mutations, THE Quality_Gate SHALL verify Organization ownership, required attribution fields, immutability, and secret redaction.
23. WHEN the Quality Gate tests Site content selection with generated Articles, Article Sites, Regions, Categories, and publication outcomes, THE Quality_Gate SHALL verify that every returned Article has a published Article Site record for the resolved Site and required filters.
24. WHEN the Quality Gate tests CMS and Telegram entry points with generated equivalent authorized commands, THE Quality_Gate SHALL verify equivalent Business Service inputs and persisted outcomes.
25. WHEN a property-based test fails, THE Quality_Gate SHALL report the minimized counterexample, seed, property name, and sanitized failure context needed to reproduce the failure.
26. IF a property-based test requires an external managed service, THEN THE Quality_Gate SHALL test the generated property against an in-memory or mocked boundary and retain representative integration tests for the managed-service connection.
27. WHEN the Quality Gate tests object-key reservation with generated occupied candidates, THE Quality_Gate SHALL verify that reservation produces a different key and preserves the existing object and Media Asset metadata.
28. WHEN the Quality Gate tests dispatch recovery with generated duplicate reconciliation attempts, THE Quality_Gate SHALL verify one logical queue dispatch, one Publishing Job, and one Article Site relationship per target Site within Retry Policy bounds.
29. WHEN the Quality Gate tests webhook replay handling with generated concurrent duplicate identifiers, THE Quality_Gate SHALL verify one atomic Webhook Replay Claim and one logical processing outcome within the freshness acceptance window.
30. WHEN the Quality Gate tests public media authorization with generated Sites, Articles, publication outcomes, and Media Assets, THE Quality_Gate SHALL verify access only for active assets referenced by the resolved Site or its published Articles.
31. WHEN the Quality Gate tests Control Plane Hostname conflicts with generated Root Domain and Site configurations, THE Quality_Gate SHALL verify rejection before public Site activation.
