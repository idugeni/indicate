-- Hapus enum billing_order_status yang yatim (tabel orders sudah pensiun di v97).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP TYPE IF EXISTS public.billing_order_status;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (100, 'drop_billing_order_status', 'sha256:cdfc844c44da1913995da472008fcc9ae513e8f3da05fb8a22f40a90ec6e17f1');

