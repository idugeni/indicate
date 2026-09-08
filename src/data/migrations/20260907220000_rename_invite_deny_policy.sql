-- Samarkan nama policy terakhir era billing: org_invitations memakai
-- deny-all generik (USING/WITH CHECK false, perilaku identik), sama seperti
-- tabel function-only lain (retention/telegram/outbox). Tanpa ini satu nama
-- `billing_function_only` tersisa di katalog.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP POLICY IF EXISTS billing_function_only ON public.org_invitations;--> statement-breakpoint
CREATE POLICY org_invitations_function_only ON public.org_invitations FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (99, 'rename_invite_deny_policy', 'sha256:7e690674684da5bcdbdd5bcab84a2c25f4f15ec3449779c71850976b195a3640');

