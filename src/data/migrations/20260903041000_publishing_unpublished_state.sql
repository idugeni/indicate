-- Penarikan publikasi per-target: state terminal `unpublished`.
--
-- PostgreSQL tidak mengizinkan ALTER TYPE ... ADD VALUE di dalam blok
-- transaksi; terapkan file ini di luar transaksi (psql / SQL editor).

ALTER TYPE publishing_state ADD VALUE 'unpublished';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (60, 'publishing_unpublished_state', 'sha256:673d0de4e1eaba41c43b29bf927676dc88a94ed97d05d4f8150dc9ed24a89279');
