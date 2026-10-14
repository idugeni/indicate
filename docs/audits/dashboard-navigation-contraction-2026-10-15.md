# Dashboard Navigation Contraction — 2026-10-15

## Scope and evidence

Repository: `idugeni/indicate`
Base reviewed: `main` at `8c54004bb482ebcb274a2f953a1dcd40cf700d00`.

This is a source-level audit. It does not claim authenticated production/browser verification. The dashboard currently registers 19 views in `src/modules/dashboard/components/view-registry.ts`. Navigation is selected from the authenticated server-side actor mode: organization logins receive exactly two first-level areas, while a platform Super Admin login receives only the separate platform control-plane area. Permission grants further gate views within that mode. The dashboard shell reads the selected view from the URL, and both the workspace and view panel call `canAccessView`. Server API authorization remains an independent boundary.

## Target navigation

Organization-login navigation has exactly two first-level areas:

1. **Berita** — dashboard analytics, article listing/editorial work, global taxonomy, publishers, media, distribution, and live publication results.
2. **Organisasi** — organization overview and the signed-in user's personal profile only.

**Super Admin** is the only top-level area in platform login mode, not a third area mixed into the tenant sidebar. Domain/site infrastructure, access and integrations, monetization, audit, operations, customer management, platform billing, content, AI, and moderation live here and remain permission-gated. The mode comes from the verified server-side authentication path, not a client role label or the selected organization. Public web content retains its specific grant; AI visibility accepts the same platform grants as the AI service. UI visibility remains defense in depth and does not replace API/repository/RLS checks.

Supporting views remain nested under their owning area; no registered workflow is removed. Collapsed navigation displays area entry points rather than exposing every supporting view as a separate first-level item.

## Source findings

- The registry has 21 views and explicit metadata for every view.
- Nine views have explicit registry permission requirements; the remaining views currently have no registry-level requirement. This is a navigation/UI gate, not proof that APIs are unprotected.
- `ads` requires `site.manage`; `settings` requires `api_key.read`; `audit` and `operations` require `audit.read`; `moderation`, `customers`, and `billing` require `platform.super_admin` or the legacy `platform.customer.admin`, matching their platform-only service/API authorization; `content` requires `platform.content.manage`; `ai` accepts `platform.ai.manage`, `platform.super_admin`, or the legacy `platform.customer.admin`, matching `AiService.canManage`.
- `dashboard/page.tsx` constructs organization options differently for cookie sessions and access-key sessions. The access-key actor is bound to an organization. This behavior must be preserved.
- Article listing and publication listing can request cross-organization scope for platform-authorized actors. The UI contraction must not broaden that scope.
- Categories and tags are global taxonomy. Do not introduce organization-owned category/tag CRUD as part of this navigation change.
- Article metadata and mutations must remain scoped to the article's owning organization. Do not alter database schema, migrations, production data, RLS, or deployment settings for these navigation and view-permission metadata fixes.

## Required access posture

| Actor | Expected navigation/access |
|---|---|
| Organization administrator | Core editorial and publishing work for the active organization; organization settings only for granted capabilities |
| Editor/redaktur | Article creation/editing and permitted media/publication actions; no platform control plane by role name alone |
| Platform Superadmin | Platform-only customer, trust, AI, and operational controls only when the corresponding platform grant is present |
| Access-key actor | Same organization binding and grants resolved by the existing access-key actor flow; never infer wider scope from UI role labels |

Permissions, not role labels, are the authorization source. UI visibility is defense-in-depth; every API/command must retain its server-side authorization checks.

## Acceptance criteria

- Organization logins see exactly two first-level areas: Berita and Organisasi; platform Super Admin logins see only the Super Admin area.
- Desktop sidebar, mobile navigation, command palette, initial landing view, and direct-view guard all enforce the same authenticated mode.
- Supporting views remain nested beneath their owning area and are permission-gated by `canAccessViewInMode`; organization infrastructure, access/integrations, monetization, audit, and operations are platform-owned.
- Restricted views are hidden from navigation and remain blocked when their URL is entered directly.
- Organization switching clears stale payload/error state and does not leak data across tenants.
- Cookie login and access-key login remain functional.
- Global categories/tags and organization-owned article metadata are unchanged.
- Existing editorial, media, distribution, live-results, audit, and platform workflows remain reachable to authorized actors; platform billing and AI visibility match the grants accepted by their services.
- Relevant registry/sidebar/workspace tests pass, followed by typecheck, lint, test suite, build, and PR CI.
- No production data/schema mutation and no merge until evidence supports it.

## Verification status

The source-level inspection above is complete. Authenticated role-matrix tests, live production behavior, and browser/mobile verification remain pending and must not be represented as passed until executed.
