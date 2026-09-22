-- Verification invariant scoped to usable publishers: active + verified rows must cite evidence.
--
-- Archived rows are inert (hidden from creation, blocked for new articles, excluded
-- from public delivery joins) and keep their history untouched, so they are
-- exempt. Apply only after brand-publisher remediation; the check validates
-- existing rows on creation.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.publishers ADD CONSTRAINT publishers_verified_requires_evidence CHECK (status <> 'active' OR verification_status <> 'verified' OR evidence_reference IS NOT NULL);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (150, 'publisher_verification_evidence_scoped', 'sha256:a0e5414ffb0981f69339fb3d34ed015d18a7d41096e2a955649a4a53cf72b623');
