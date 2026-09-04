-- One-time grant: platform.super_admin to the owner.
--
-- NOT a numbered migration (run once, manually, with the migration credential
-- AFTER 20260903032000_superadmin_tier_and_pro_plan is applied). Idempotent:
-- safe to re-run. Requires psql variable substitution:
--
--   psql "$DATABASE_URL" \
--     -v owner_user_id='00000000-0000-0000-0000-000000000000' \
--     -v platform_organization_id='11111111-1111-1111-1111-111111111111' \
--     -f src/database/scripts/grant-platform-super-admin.sql
--
-- :owner_user_id            public.users.id of the owner (must be active).
-- :platform_organization_id public.organizations.id designated as THE platform
--                           org. Until this is registered, the
--                           roles_superadmin_platform_guard trigger rejects
--                           every tier='superadmin' row (fail-closed).

-- 0. Preconditions (fail fast with a clear error, not a silent no-op).
DO $$
BEGIN
  IF :'platform_organization_id' IS NULL OR :'owner_user_id' IS NULL THEN
    RAISE EXCEPTION 'grant-platform-super-admin: -v owner_user_id and -v platform_organization_id are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = :'owner_user_id'::uuid AND status = 'active') THEN
    RAISE EXCEPTION 'grant-platform-super-admin: owner user % is missing or not active', :'owner_user_id';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = :'platform_organization_id'::uuid) THEN
    RAISE EXCEPTION 'grant-platform-super-admin: platform organization % is missing', :'platform_organization_id';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.permissions
    WHERE scope = 'platform' AND organization_id IS NULL AND name = 'platform.super_admin'
  ) THEN
    RAISE EXCEPTION 'grant-platform-super-admin: migration 42 (superadmin_tier_and_pro_plan) is not applied yet';
  END IF;
END
$$;

-- 1. Register the platform organization (enables superadmin-tier roles there).
INSERT INTO public.platform_organizations (organization_id)
VALUES (:'platform_organization_id'::uuid)
ON CONFLICT DO NOTHING;

-- 2. Grant platform.super_admin to the owner (keeps any existing grants).
SELECT indicate_private.permission_provision_platform(
  :'owner_user_id'::uuid,
  'platform.super_admin',
  'grant-platform-super-admin.sql one-time owner grant'
);

-- 3. Verify (returns exactly one row when the grant landed).
SELECT u.id AS owner_user_id, p.name AS permission
FROM public.platform_user_permissions AS grant_row
JOIN public.users AS u ON u.id = grant_row.user_id
JOIN public.permissions AS p ON p.id = grant_row.permission_id
WHERE grant_row.user_id = :'owner_user_id'::uuid
  AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = 'platform.super_admin';
