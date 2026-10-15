# Dashboard Navigation Contraction — 2026-10-15

## Scope and evidence

Repository: `idugeni/indicate`
Base reviewed: `main` at `8c54004bb482ebcb274a2f953a1dcd40cf700d00`.

This is a source-level audit. It does not claim authenticated production/browser verification. The dashboard currently registers 21 views in `src/modules/dashboard/components/view-registry.ts`. Navigation is selected from the authenticated server-side actor mode: organization logins receive exactly three first-level entries (Dashboard, Artikel, Organisasi), while a platform Super Admin login receives only the separate platform control-plane area. Permission grants further gate views within that mode. The dashboard shell reads the selected view from the URL, and the workspace and view panel call `canAccessViewInMode`. Server API authorization remains an independent boundary.

## Target navigation

Organization-login navigation has exactly three first-level entries:

1. **Dashboard** — the overview landing page.
2. **Artikel** — the article inventory, create/edit workflow, global taxonomy, media, publishing/distribution, and live publication results. Supporting workflows remain available by contextual article actions, not as additional primary navigation entries.
3. **Organisasi** — the active organization's own identity (name, description, logo URL, contact details, brand colors) and the signed-in user's personal profile. It does not contain domain/site infrastructure, access/integrations, monetization, audit, or operations.

**Super Admin** is the only top-level area in platform login mode, not a third area mixed into the tenant sidebar. All authorized workflows are nested under this single Super Admin area, including cross-organization editorial views and domain/site infrastructure, access and integrations, monetization, audit, operations, customer management, platform billing, content, AI, and moderation. Each capability remains permission-gated. The mode comes from the verified server-side authentication path, not a client role label or the selected organization. Public web content retains its specific grant; AI visibility accepts the same platform grants as the AI service. UI visibility remains defense in depth and does not replace API/repository/RLS checks.

Supporting views remain nested under their owning area; no registered workflow is removed. Collapsed navigation displays area entry points rather than exposing every supporting view as a separate first-level item.

## Source findings

- The registry has 21 views and explicit metadata for every view.
- Nine views have explicit registry permission requirements; the remaining views currently have no registry-level requirement. This is a navigation/UI gate, not proof that APIs are unprotected.
- `ads` requires `site.manage`; `settings` requires `api_key.read`; `audit` and `operations` require `audit.read`; `moderation`, `customers`, and `billing` require `platform.super_admin` or the legacy `platform.customer.admin`, matching their platform-only service/API authorization; `content` requires `platform.content.manage`; `ai` accepts `platform.ai.manage`, `platform.super_admin`, or the legacy `platform.customer.admin`, matching `AiService.canManage`.
- `dashboard/page.tsx` constructs organization options differently for cookie sessions and access-key sessions. A regular access key stays bound to its issuing organization; a verified access-key actor with the live `platform.super_admin` grant receives the existing cross-organization options and platform navigation. The verified platform grant, not a role label, determines this mode.
- Article listing and publication listing can request cross-organization scope for platform-authorized actors. Cross-organization article scope is enabled only when the verified actor has `platform.super_admin` in either cookie-session or access-key authentication; ordinary access keys remain organization-bound. The UI contraction must not broaden or narrow that existing scope.
- Categories and tags are global taxonomy. Do not introduce organization-owned category/tag CRUD as part of this navigation change.
- Article metadata and mutations must remain scoped to the article's owning organization. The organization identity editor uses the existing `organizations.name` and a validated, versioned `customer_metadata.organizationIdentity` namespace; it does not reuse per-site `site_settings` branding or require a schema migration. The API selects only the namespaced JSONB value, updates it with `jsonb_set`, checks the live tenant actor and existing organization-management grants, uses optimistic version checks, and writes an audit record in the same transaction.

## Required access posture

| Actor | Expected navigation/access |
|---|---|
| Organization administrator | Core editorial and publishing work plus editable own-organization identity and personal profile; no platform infrastructure/access controls |
| Editor/redaktur | Article creation/editing and permitted media/publication actions; no platform control plane by role name alone |
| Platform Superadmin | Platform-only customer, trust, AI, and operational controls only when the corresponding platform grant is present |
| Regular access-key actor | Bound to the issuing organization and its live grants; never infer wider scope from role labels |
| Verified Super Admin access key | Platform navigation and cross-organization switching/scope, based on the live `platform.super_admin` grant and existing server-side checks |

Permissions, not role labels, are the authorization source. UI visibility is defense-in-depth; every API/command must retain its server-side authorization checks.

## Acceptance criteria

- Organization logins see exactly three first-level entries: Dashboard, Artikel, and Organisasi; platform Super Admin logins see only the Super Admin area.
- Desktop sidebar, mobile navigation, command palette, initial landing view, and direct-view guard all enforce the same authenticated mode.
- Supporting views remain nested beneath their owning area and are permission-gated by `canAccessViewInMode`; organization infrastructure, access/integrations, monetization, audit, and operations are platform-owned.
- Restricted views are hidden from navigation and remain blocked when their URL is entered directly.
- Organization switching clears stale payload/error state and does not leak data across tenants.
- Cookie and access-key login remain functional; a verified Super Admin access key retains platform mode, while ordinary access keys remain tenant-bound.
- Global categories/tags and organization-owned article metadata are unchanged. Organization identity is persisted separately from site presentation settings through a versioned, validated JSONB namespace while preserving other customer metadata.
- Existing editorial, media, distribution, live-results, audit, and platform workflows remain reachable to authorized actors; platform billing and AI visibility match the grants accepted by their services. Article inventory exposes a copy action that gathers deduplicated HTTP(S) URLs from direct publication results, active published site assignments, and bridge-published records, preserving existing published URL paths where recorded. Copy output is numbered one URL per line, and unpublished/queued targets are excluded.
- Organization identity API and form regression tests cover tenant authorization denial, management-permission denial, HTTPS validation, optimistic versioning, audit insertion, and the targeted JSONB update. Relevant registry/sidebar/workspace tests pass, followed by typecheck, lint, test suite, build, and PR CI.
- No production data/schema mutation and no merge until evidence supports it.

## Verification status

The source-level inspection and focused organization identity tests are complete. Authenticated production role-matrix tests and browser/mobile verification remain pending and must not be represented as passed until executed.
