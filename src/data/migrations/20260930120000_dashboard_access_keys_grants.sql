-- Grant runtime table access for dashboard access keys.
--
-- New tables do not inherit the blanket grant from the security migration,
-- so this explicit grant is required (same pattern as the AI control-plane
-- tables). Least-privilege scope: the application selects, inserts, and
-- updates access-key rows; nothing ever deletes them. Row isolation stays
-- with the tenant_isolation RLS policy.
GRANT SELECT, INSERT, UPDATE ON public.dashboard_access_keys TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (231, 'dashboard_access_keys_grants', 'sha256:d1d068f4d05ab43f7b7af10d009269183462d7a79630a77abe9b9675aedede1f');
