-- Domain rename: audit entry point 'cms' becomes 'dashboard'.
--
-- Follows the rename of the application EntryPoint union and the
-- audit_entry_point enum in src/database/schema/editorial.ts. Applied
-- databases created the enum label 'cms'; fresh installs use the bootstrap
-- script, which already declares 'dashboard'. RENAME VALUE preserves the
-- label position and transparently retargets existing audit rows, so no data
-- rewrite is required. The enum type name itself is unchanged.

ALTER TYPE "public"."audit_entry_point" RENAME VALUE 'cms' TO 'dashboard';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (27, 'dashboard_entry_point', 'dashboard-entry-point-v1');
