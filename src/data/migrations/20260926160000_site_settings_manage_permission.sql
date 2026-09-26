-- Make `site_settings.manage` a real organization permission.
--
-- `indicate_private.mutate_site_settings` guards on `site_settings.manage`, but
-- that permission was never sanctioned. It is absent from
-- `permission_definitions`, its only row in `permissions` was platform-scoped,
-- and `permission_has_tenant` resolves a tenant permission through
-- memberships, roles, and role_permissions only. A platform-scoped row can never
-- satisfy that check, and no grant existed anywhere either, so the function was
-- unreachable for every actor.
--
-- The permission becomes organization-scoped, one row per organization that
-- already manages sites, granted to exactly the roles that hold `site.manage`.
-- That is the set the dashboard already authorizes to edit site settings, so the
-- function and the dashboard share one authority instead of introducing a second
-- one over the same table.
--
-- The platform-scoped row is removed last, and only after checking that nothing
-- references it: it cannot match the tenant check, so keeping it would only
-- mislead the next reader.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.permission_definitions (scope, name, description, sort_order)
VALUES ('organization'::public.permission_scope, 'site_settings.manage', 'Manage site settings', 28)
ON CONFLICT (scope, name) DO NOTHING;--> statement-breakpoint
INSERT INTO public.permissions (id, organization_id, name, scope, description, created_at)
SELECT gen_random_uuid(), source.organization_id, 'site_settings.manage',
       'organization'::public.permission_scope, 'Manage site settings', now()
  FROM public.permissions AS source
 WHERE source.name = 'site.manage'
   AND source.organization_id IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT granted.organization_id, granted.role_id, target.id
  FROM public.role_permissions AS granted
  JOIN public.permissions AS source
    ON source.id = granted.permission_id AND source.name = 'site.manage'
  JOIN public.permissions AS target
    ON target.organization_id = granted.organization_id AND target.name = 'site_settings.manage'
ON CONFLICT DO NOTHING;--> statement-breakpoint
DO $$
DECLARE
  phantom integer;
BEGIN
  SELECT count(*) INTO phantom
    FROM public.permissions AS candidate
   WHERE candidate.name = 'site_settings.manage'
     AND candidate.organization_id IS NULL
     AND (
       EXISTS (SELECT 1 FROM public.role_permissions AS grant_row WHERE grant_row.permission_id = candidate.id)
       OR EXISTS (SELECT 1 FROM public.platform_user_permissions AS grant_row WHERE grant_row.permission_id = candidate.id)
     );
  IF phantom > 0 THEN
    RAISE EXCEPTION 'site_settings_permission_referenced: % platform-scoped row(s) still granted', phantom;
  END IF;
  DELETE FROM public.permissions
   WHERE name = 'site_settings.manage' AND organization_id IS NULL;
END;
$$;--> statement-breakpoint
DO $$
DECLARE
  orgs_without integer;
  roles_without integer;
  platform_left integer;
BEGIN
  SELECT count(*) INTO orgs_without
    FROM (SELECT DISTINCT organization_id FROM public.permissions WHERE name = 'site.manage') AS managed
   WHERE NOT EXISTS (
     SELECT 1 FROM public.permissions AS scoped
      WHERE scoped.name = 'site_settings.manage' AND scoped.organization_id = managed.organization_id
   );
  IF orgs_without > 0 THEN
    RAISE EXCEPTION 'site_settings_permission_incomplete: % organization(s) missing it', orgs_without;
  END IF;
  SELECT count(*) INTO roles_without
    FROM public.role_permissions AS granted
    JOIN public.permissions AS source ON source.id = granted.permission_id AND source.name = 'site.manage'
   WHERE NOT EXISTS (
     SELECT 1
       FROM public.role_permissions AS mirrored
       JOIN public.permissions AS target ON target.id = mirrored.permission_id
      WHERE mirrored.organization_id = granted.organization_id
        AND mirrored.role_id = granted.role_id
        AND target.name = 'site_settings.manage'
   );
  IF roles_without > 0 THEN
    RAISE EXCEPTION 'site_settings_grant_incomplete: % role grant(s) missing it', roles_without;
  END IF;
  SELECT count(*) INTO platform_left
    FROM public.permissions
   WHERE name = 'site_settings.manage' AND organization_id IS NULL;
  IF platform_left > 0 THEN
    RAISE EXCEPTION 'site_settings_permission_phantom_left: % platform-scoped row(s) remain', platform_left;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (202, 'site_settings_manage_permission', 'sha256:7a6a06fed65423b64d05ee575b5d138e6c3a19d599714ce2bf4ef2b9f4c87273');
