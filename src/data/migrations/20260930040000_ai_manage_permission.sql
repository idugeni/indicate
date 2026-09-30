-- Seed the platform AI grant for the dashboard AI Control Plane view.
-- Forward-only; replay-safe via ON CONFLICT DO NOTHING. Grants to platform
-- roles happen through the existing role-permission assignment flow.

INSERT INTO public.permissions(id, organization_id, name, scope, description)
VALUES ('00000000-0000-4000-8000-000000006004', NULL, 'platform.ai.manage', 'platform', 'Manage AI assistant credentials and routing policy')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (223, 'ai_manage_permission', 'sha256:e235f3b6846eb58b7772df2f1f5da6647866cb17eb8d533a144e1ec13aa568e4');
