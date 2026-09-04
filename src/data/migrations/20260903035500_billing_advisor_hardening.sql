-- F3-DB: advisor hardening (v49).
--
-- 1. Function-only tables (enterprise_leads, invoices, org_invitations):
--    akses langsung ditolak eksplisit (USING/WITH CHECK false) — semua baca
--    tulis lewat fungsi SECURITY DEFINER. Menjadikan default-deny eksplisit
--    sekaligus menutup temuan rls_enabled_no_policy.
-- 2. Index penutup untuk FK org_invitations.created_by (unindexed_foreign_keys).
-- 3. Policy content_write_platform (FOR ALL, 8 tabel konten) dipecah menjadi
--    INSERT/UPDATE/DELETE agar SELECT hanya dievaluasi satu policy
--    (content_runtime_read) — menutup multiple_permissive_policies.
--    TIDAK menyentuh: unused_index (DB pra-traffic; index dibutuhkan saat
--    volume datang) dan auth_leaked_password_protection (setting dashboard).

CREATE POLICY billing_function_only ON public.enterprise_leads FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY billing_function_only ON public.invoices FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY billing_function_only ON public.org_invitations FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_invitations_created_by_idx" ON "org_invitations" USING btree ("created_by");--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.service_tiers;--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.testimonials;--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.faqs;--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.media_showcase;--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.contact_channels;--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.permission_definitions;--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.color_presets;--> statement-breakpoint
DROP POLICY IF EXISTS content_write_platform ON public.template_presets;--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.service_tiers FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.service_tiers FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.service_tiers FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.testimonials FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.testimonials FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.testimonials FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.faqs FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.faqs FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.faqs FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.media_showcase FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.media_showcase FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.media_showcase FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.contact_channels FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.contact_channels FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.contact_channels FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.permission_definitions FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.permission_definitions FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.permission_definitions FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.color_presets FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.color_presets FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.color_presets FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_insert ON public.template_presets FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_update ON public.template_presets FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
CREATE POLICY content_write_platform_delete ON public.template_presets FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (49, 'billing_advisor_hardening', 'sha256:7842175ae1c49ecac59af3ca022583d40fbe99747c439ef44b5f3751cac524b7');
