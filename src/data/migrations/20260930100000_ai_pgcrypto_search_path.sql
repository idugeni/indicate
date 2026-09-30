-- Perbaiki search_path fungsi envelope AI agar pgcrypto ketemu.
--
-- `pgp_sym_encrypt`/`pgp_sym_decrypt` hidup di skema `extensions`, tetapi
-- `encrypt_ai_key`/`decrypt_ai_key` dikunci ke search_path tanpa `extensions`,
-- sehingga setiap issue/test kredensial gagal closed dengan 42883. ALTER ini
-- idempotent: aman dijalankan ulang saat apply berurutan.
ALTER FUNCTION indicate_private.encrypt_ai_key(text) SET search_path TO pg_catalog, public, indicate_private, extensions;--> statement-breakpoint
ALTER FUNCTION indicate_private.decrypt_ai_key(text) SET search_path TO pg_catalog, public, indicate_private, extensions;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (229, 'ai_pgcrypto_search_path', 'sha256:e89c926628f9a53c895153199dad035a903b5b73c8cf8a7b84be17bd509a9293');
