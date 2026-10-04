-- Satu guard cakupan permission role: pertahankan yang ketat.
--
-- `role_permissions_scope_guard` (longgar, mengizinkan permission platform
-- di role tenant) tidak pernah menang karena `permission_role_scope_guard`
-- (ketat, dibuat langsung di produksi tanpa migrasi) selalu menolak lebih
-- dulu. Migrasi ini menghapus trigger lama dan mengabadikan trigger ketat
-- agar bootstrap fresh konvergen sama dengan produksi. Grant platform tetap
-- lewat `platform_user_permissions`, bukan role.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DROP TRIGGER IF EXISTS role_permissions_scope_guard ON public.role_permissions;--> statement-breakpoint
DROP TRIGGER IF EXISTS permission_role_scope_guard ON public.role_permissions;--> statement-breakpoint
CREATE TRIGGER permission_role_scope_guard
BEFORE INSERT OR UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION indicate_private.permission_role_scope_guard();--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.enforce_role_permission_scope();--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (267, 'role_permission_guard_single', 'sha256:28f43ecc0c7b791266c947866450981904af9ef85128dd232c5691b8e3cb0356');
