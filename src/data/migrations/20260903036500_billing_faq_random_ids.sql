-- F3-DB: acak ID faq seed.
--
-- ID seed berurutan (...70011-70014) terlihat seperti mock. FAQs tidak
-- direferensikan FK mana pun, jadi aman diacak. Ke depan seed konten
-- memakai gen_random_uuid(), bukan UUID tetap.

UPDATE public.faqs SET id = gen_random_uuid(), updated_at = now()
WHERE id IN (
  '00000000-0000-4000-8000-000000007011',
  '00000000-0000-4000-8000-000000007012',
  '00000000-0000-4000-8000-000000007013',
  '00000000-0000-4000-8000-000000007014'
);--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (51, 'billing_faq_random_ids', 'sha256:bcabfe159c0a78ab0ae5b9b3fde8c2ffd55faa1840f761bb8b7c03e461bbbe30');
