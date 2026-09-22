-- Direct organization guard for multi-category assignments, matching the
-- sibling `article_sites` convention. The composite FKs already guarantee the
-- organization transitively; this single-column FK fails closed on
-- organization removal instead of relying on that transitivity.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.article_categories
  ADD CONSTRAINT article_categories_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (154, 'article_categories_org_fk', 'sha256:377d0691ab0a9c6f9e6a14a46048d7f7c04df63cdf88e596006e006a1af13327');
