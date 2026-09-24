-- Per-copy robots kill-switch: `article_sites.seo_robots_directive` overrides the
-- site default for a single cascade copy (NULL inherits). Reuses the shared
-- `seo_robots_directive` enum so the vocabulary stays identical to
-- `site_settings.seo_robots_directive`. Delivery projects it onto the SEO
-- document; the renderer already honors per-article directives.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.article_sites ADD COLUMN seo_robots_directive seo_robots_directive;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (165, 'article_site_robots_directive', 'sha256:5a65d89520a3b324d3136e751aefc44a4937d06311cce800137ac61bc6c2b769');
