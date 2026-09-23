-- City hierarchy for cascade publishing. Regions gain a kind plus an optional
-- parent region: a city shares the one-label subdomain contract
-- (`{slug}.{apex}`), and org-scoped slug uniqueness keeps city and region
-- slugs collision-free by construction, so no resolver, trigger, DNS, or
-- certificate changes are needed. Assignment rows record their origin so
-- automatic cascade stays auditable and recomputable; cascaded copies may
-- carry an inherited canonical URL to consolidate search equity.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TYPE public.region_kind AS ENUM ('region', 'city');--> statement-breakpoint
ALTER TABLE public.regions ADD COLUMN kind public.region_kind NOT NULL DEFAULT 'region';--> statement-breakpoint
ALTER TABLE public.regions ADD COLUMN parent_region_id uuid;--> statement-breakpoint
ALTER TABLE public.regions ADD CONSTRAINT regions_parent_fk FOREIGN KEY (organization_id, parent_region_id) REFERENCES public.regions(organization_id, id) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE public.regions ADD CONSTRAINT regions_kind_parent_consistent CHECK ((kind = 'city') = (parent_region_id IS NOT NULL));--> statement-breakpoint
ALTER TABLE public.article_sites ADD COLUMN assignment_source text NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE public.article_sites ADD CONSTRAINT article_sites_assignment_source_values CHECK (assignment_source IN ('manual', 'auto'));--> statement-breakpoint
ALTER TABLE public.article_sites ADD COLUMN expanded_from_site_id uuid;--> statement-breakpoint
ALTER TABLE public.article_sites ADD CONSTRAINT article_sites_expanded_from_fk FOREIGN KEY (organization_id, expanded_from_site_id) REFERENCES public.sites(organization_id, id) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE public.article_sites ADD COLUMN custom_canonical_url text;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (161, 'cascade_hierarchy', 'sha256:fecb170088d911cf9c8624593d585da2b92cc5afaae74c067fb9a69cbec40012');
