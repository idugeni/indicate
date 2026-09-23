-- Covering indexes for the cascade self-referencing FKs (advisor 0001).
-- `article_sites_expanded_from_fk` and `regions_parent_fk` are composite
-- (organization_id, fk) without a covering index; both are small, so plain
-- CREATE INDEX is safe without CONCURRENTLY.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE INDEX "article_sites_expanded_from_idx" ON "article_sites" USING btree ("organization_id","expanded_from_site_id");--> statement-breakpoint
CREATE INDEX "regions_parent_idx" ON "regions" USING btree ("organization_id","parent_region_id");--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (163, 'cascade_fk_covering_indexes', 'sha256:fbfb1da44e997b513c9c216484fcab9c343c20d413afd494bb7532194601d500');
