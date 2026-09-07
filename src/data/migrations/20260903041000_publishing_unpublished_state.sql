-- Penarikan publikasi per-target: state terminal `unpublished`.
--
-- PostgreSQL tidak mengizinkan ALTER TYPE ... ADD VALUE di dalam blok
-- transaksi; terapkan file ini di luar transaksi (psql / SQL editor).

ALTER TYPE publishing_state ADD VALUE 'unpublished';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (60, 'publishing_unpublished_state', 'sha256:501add921dcf4a38e130a9577d6f79e9ffab08defa1c90febc22268010e70f4a');
