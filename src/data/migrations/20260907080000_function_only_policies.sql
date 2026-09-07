-- F85: kebijakan default-deny eksplisit untuk tabel function-only baru (v79/v80/v83).
-- Mengikuti pola billing_function_only: RLS tetap enabled+forced, tetapi linter
-- keamanan Supabase menandai tabel tanpa kebijakan apa pun. Kebijakan
-- USING (false) WITH CHECK (false) membuat penolakan eksplisit (perilaku sama:
-- akses hanya lewat fungsi SECURITY DEFINER).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE POLICY litigation_holds_function_only ON public.litigation_holds FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY org_erasure_requests_function_only ON public.org_erasure_requests FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY telegram_outbox_function_only ON public.telegram_outbox FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (85, 'function_only_policies', 'sha256:9b15cbca7b133758831bd739e09b017674976d56f5877981398ab0aae2e1e1a1');
