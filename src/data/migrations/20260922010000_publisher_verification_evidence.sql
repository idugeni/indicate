-- Verification invariant at the database level: a verified publisher must cite evidence.
--
-- Mirrors the application rule in TenantBusinessService.publisherDecision, which
-- rejects submit/approve without an evidence reference. Declared NOT VALID so
-- this migration applies cleanly while legacy rows are remediated; run
-- VALIDATE CONSTRAINT after archiving unverified-evidence rows, then drop the
-- NOT VALID marker in a follow-up migration. New and updated rows are checked
-- immediately regardless of the marker.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.publishers ADD CONSTRAINT publishers_verified_requires_evidence CHECK (verification_status <> 'verified' OR evidence_reference IS NOT NULL) NOT VALID;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (148, 'publisher_verification_evidence', 'sha256:115d5c0eea5602a078db3c4e913f1b9b14d91f798b21103e280a5d07a94808e7');
