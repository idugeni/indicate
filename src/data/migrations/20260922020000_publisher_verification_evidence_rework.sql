-- Drop the unscoped verification check: it evaluates rewritten legacy rows and
-- blocks unrelated mutations until remediation finishes. Replaced by a
-- status-scoped variant in a later migration once brand-publisher rows are
-- archived. Forward-only; re-adding a check never replays old violations.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.publishers DROP CONSTRAINT IF EXISTS publishers_verified_requires_evidence;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (149, 'publisher_verification_evidence_rework', 'sha256:c00672c0691a5a11e5ed66fbafea4399bd65a1223ef9c798ab1f631a6d82c7d3');
