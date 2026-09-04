-- F2b-DB: izinkan baca orders untuk pemilik + platform admin.
--
-- orders memakai FORCE RLS tanpa policy (akses tulis hanya via fungsi). Baca
-- pasca-tulis di repository (fetchOrder) dan pratinjau bukti butuh SELECT
-- langsung: policy sempit ini mengizinkan pemilik order (dipetakan lewat
-- verified-user context yang selalu di-set billingContext) dan platform admin.
-- Penegakan otorisasi utama tetap di service layer.

DROP POLICY IF EXISTS orders_owner_read ON public.orders;--> statement-breakpoint
CREATE POLICY orders_owner_read ON public.orders FOR SELECT TO indicate_runtime USING (
  user_id IN (SELECT u.id FROM public.users AS u WHERE u.auth_user_id = indicate_private.current_verified_user_id())
  OR indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id())
);--> statement-breakpoint
GRANT SELECT ON public.orders TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (45, 'billing_orders_rls_reads', 'sha256:0fc95f920d1dd57d9e38f71044490497542fc01323c641762f3c87bf0597e8e1');
