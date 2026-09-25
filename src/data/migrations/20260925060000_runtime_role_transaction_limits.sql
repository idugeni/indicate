-- Bound runtime work on the Supabase transaction pooler.
--
-- The application uses port 6543, where per-session SET statements are not
-- durable. Role defaults apply when Supavisor opens the backend connection and
-- prevent abandoned transactions or long statements from retaining a backend
-- slot indefinitely.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER ROLE indicate_runtime SET statement_timeout = '15s';--> statement-breakpoint
ALTER ROLE indicate_runtime SET lock_timeout = '5s';--> statement-breakpoint
ALTER ROLE indicate_runtime SET idle_in_transaction_session_timeout = '30s';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (174, 'runtime_role_transaction_limits', 'sha256:b1b7a5f8568b985dec73ebc7b3c3b5512637fc01c222457c50b71c6a46dfceb0');
