-- Drop orphan retention history for removed Telegram categories.
--
-- retention_sweep no longer emits telegram_conversations/telegram_outbox
-- since the Telegram removal release, but historical retention_runs rows
-- keep those labels. Delete the 24 orphan rows so monitoring reads clean.
-- audit_logs rows are never touched: insert-only by design with daily WORM
-- export (see docs/migrations.md).
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DELETE FROM public.retention_runs WHERE category IN ('telegram_conversations', 'telegram_outbox');--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (171, 'retention_runs_drop_telegram_history', 'sha256:0215c9b14f7d30af9c00812abf33c05dc8108071ba40359d7678f46693ea4b3a');
