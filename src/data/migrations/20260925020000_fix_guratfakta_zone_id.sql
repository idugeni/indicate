-- Correct stale Cloudflare zone id for guratfakta.my.id.
--
-- Live zone is 332bddc96a12921de893d5892fa4ee6d; the stored value pointed at
-- a non-existent zone, so zone-scoped authority calls and WAF rollouts miss
-- it. Single-row metadata correction, no schema change.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
UPDATE public.domains SET cloudflare_zone_id = '332bddc96a12921de893d5892fa4ee6d', updated_at = now() WHERE normalized_hostname = 'guratfakta.my.id';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (170, 'fix_guratfakta_zone_id', 'sha256:dcf7c10b133d738d2608fd30eb343fa0c607a6d3c6079e77372634845a2121de');
