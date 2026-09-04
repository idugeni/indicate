-- F3-DB: index users(email) dari temuan Index Recommendation.
--
-- Query audit (users by email -> memberships -> orgs/roles) seq-scan di
-- users.email karena belum ada index. Dua saran lainnya (memberships.user_id
-- dan roles.id standalone) DITOLAK dengan alasan: sudah ter-cover oleh
-- kolom awal index komposit yang ada (memberships_user_status_idx berawalan
-- user_id; roles_pk berawalan organization_id,id sesuai persis join-nya).
-- Index standalone di sana hanya menambah beban tulis tanpa manfaat baca.

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "public"."users" USING btree ("email");--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (50, 'billing_users_email_idx', 'sha256:03cae1232fe49299bc566bb4a749187df51b06ae221fb384a736a41b1c1625c8');
