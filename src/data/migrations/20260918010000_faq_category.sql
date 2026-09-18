-- Topik FAQ untuk pengelompokan pusat bantuan.
--
-- Expand (nullable); baca fallback ke 'Umum' bila NULL; backfill 13 baris
-- kanonis sesuai topiknya (Platform, Penerbitan, Langganan & Biaya,
-- Keamanan Data, Migrasi, Bantuan). Checksum di bawah adalah sha256 heks
-- dari isi berkas ini sebelum baris INSERT ledger.
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS "category" text;--> statement-breakpoint
UPDATE public.faqs SET category = 'Platform' WHERE id = 'dfd974ec-3490-4345-9201-cc46f5e78302';--> statement-breakpoint
UPDATE public.faqs SET category = 'Penerbitan' WHERE id IN ('b1f479b0-a5db-4ba7-a335-62dff874b389', '64258005-e08f-4d51-af15-82703f9832f4');--> statement-breakpoint
UPDATE public.faqs SET category = 'Langganan & Biaya' WHERE id IN ('63f24875-3436-4a7f-b730-4441c0106a1c', '2a0f30ac-20aa-4971-9502-944c35c1c705', 'dc114ddc-b39c-4691-920c-4f9448aff113', '64c110a9-da4b-4e9f-9be8-1190096ad96a', '761e83a9-b50d-4766-81c9-efd5652642cd', 'acd28953-8f62-42a8-9e11-9916dd86b793');--> statement-breakpoint
UPDATE public.faqs SET category = 'Keamanan Data' WHERE id = 'b1d4b620-5724-40d5-8b29-ee1654d23f47';--> statement-breakpoint
UPDATE public.faqs SET category = 'Migrasi' WHERE id = '1de04400-5846-4d71-a6e4-b66668c3fc76';--> statement-breakpoint
UPDATE public.faqs SET category = 'Bantuan' WHERE id IN ('d849d3fe-c818-469d-bc54-10aa1b8dd235', '7e9f1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b');--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (125, 'faq_category', 'sha256:2b23e29c0fd17a13e0940e7156632f27c6a992c8e9deddb97598bc125b3c7a65');
