-- F2b-DB: seed seluruh definisi permission organisasi + backfill.
--
-- Temuan: permission_definitions hanya berisi 5 nama integrasi, sementara kode
-- mensyaratkan 27 nama (17 dashboard + 5 publishing + 5 integrasi). Akibatnya
-- org_ensure_permissions tidak pernah membuat baris permissions untuk
-- domain.manage / article.manage / dst, sehingga SELURUH mutasi dashboard
-- tenant pasti deny. Migrasi ini menutup gap tersebut.
-- 1. Insert 22 definisi yang hilang (idempoten via ON CONFLICT).
-- 2. Backfill org_ensure_permissions untuk semua org yang sudah ada.
-- 3. Grant SEMUA permission organisasi ke role Superadmin di org platform
--    (pemilik platform = akses penuh; pembatasan solo berlaku untuk org
--    pelanggan via ensureAdministratorRole di kode aplikasi).

INSERT INTO public.permission_definitions (scope, name, description, sort_order) VALUES
  ('organization', 'dashboard.read', 'Read dashboard overview', 6),
  ('organization', 'domain.read', 'Read domains', 7),
  ('organization', 'domain.manage', 'Manage domains', 8),
  ('organization', 'region.read', 'Read regions', 9),
  ('organization', 'region.manage', 'Manage regions', 10),
  ('organization', 'site.read', 'Read sites', 11),
  ('organization', 'site.manage', 'Manage sites', 12),
  ('organization', 'membership.read', 'Read memberships', 13),
  ('organization', 'membership.manage', 'Manage memberships', 14),
  ('organization', 'role.manage', 'Manage roles', 15),
  ('organization', 'publisher.read', 'Read publishers', 16),
  ('organization', 'publisher.manage', 'Manage publishers', 17),
  ('organization', 'publisher.verify', 'Verify publishers', 18),
  ('organization', 'article.read', 'Read articles', 19),
  ('organization', 'article.manage', 'Manage articles', 20),
  ('organization', 'analytics.read', 'Read analytics', 21),
  ('organization', 'audit.read', 'Read audit logs', 22),
  ('organization', 'media.read', 'Read media assets', 23),
  ('organization', 'media.manage', 'Manage media assets', 24),
  ('organization', 'publishing.read', 'Read publishing queue', 25),
  ('organization', 'publishing.request', 'Request publication', 26),
  ('organization', 'publishing.process', 'Process publication jobs', 27)
ON CONFLICT DO NOTHING;--> statement-breakpoint
SELECT indicate_private.org_ensure_permissions(id) FROM public.organizations;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT r.organization_id, r.id, p.id
FROM public.roles r
JOIN public.platform_organizations po ON po.organization_id = r.organization_id
JOIN public.permissions p ON p.organization_id = r.organization_id AND p.scope = 'organization'
WHERE r.tier = 'superadmin' AND r.active
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (44, 'billing_permission_definitions', 'sha256:6c4febf5f09e1780c26c03a3334217e7c5f41d95541a6d8b9f6342e62b0376e2');
