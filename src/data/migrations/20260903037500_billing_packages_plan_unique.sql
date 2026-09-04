-- F3-DB: unik per plan pada packages.
--
-- Satu plan tepat satu baris paket adalah invarian bisnis (seed idempoten
-- per plan, decide join per id). Unique constraint menegakkannya sekaligus
-- menutup saran index pada kolom plan.

ALTER TABLE public.packages ADD CONSTRAINT "packages_plan_unique" UNIQUE ("plan");--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (53, 'billing_packages_plan_unique', 'sha256:d0deed2abb01bd3527ddd9643a238cdbce7bdeae792b56863a3b9214efb1c44d059');
