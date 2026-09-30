-- Runtime access for the global AI master secret.
--
-- `ai_master_secrets` is a global singleton (no organization column) read and
-- rotated server-side only. RLS is enabled with no policy, so the runtime role
-- silently reads zero rows and provisioning looks permanently absent. Mirror
-- the `runtime_accessor` convention from the other AI control-plane tables.
-- Least-privilege scope: select, insert, and update only; rows are deactivated
-- on rotation, never deleted. `anon`/`authenticated` hold no grants on this
-- table, so the Data API stays closed regardless of this policy.
GRANT SELECT, INSERT, UPDATE ON public.ai_master_secrets TO indicate_runtime;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.ai_master_secrets FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (234, 'ai_master_secrets_runtime', 'sha256:0c6803467646cc3851db7620d90c12a71412e5f2b02b9e50ca3d3bc86e790dce');
