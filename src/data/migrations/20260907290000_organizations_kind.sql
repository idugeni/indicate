-- Penanda peran organisasi: operator portal vs pelanggan.
-- Satu tabel organizations menampung dua peran (mis. Fakta01 sebagai operator,
-- 59 UPT sebagai pelanggan); tanpa penanda, keduanya tak terbedakan di query.
-- Pecah tabel ditolak: puluhan FK komposit (organization_id, id) bergantung
-- pada satu registri tenant. Kolom kind + check + index parsial sudah cukup.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_kind_check;--> statement-breakpoint
ALTER TABLE public.organizations ADD CONSTRAINT organizations_kind_check CHECK (kind IN ('operator', 'customer'));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS organizations_kind_idx ON public.organizations USING btree (kind);--> statement-breakpoint
UPDATE public.organizations SET kind = 'operator' WHERE slug IN ('fakta01', 'indicate-platform');--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (106, 'organizations_kind', 'sha256:d04d655981dfddc3b21e9453ea7ee9fd7c810053ac924013aee09ecedd23f602');
