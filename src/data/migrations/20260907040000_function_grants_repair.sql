-- F82: grant EXECUTE yang hilang untuk fungsi worker/admin (PENDING tindak lanjut).
--
-- v33 (function_api_reconciliation) me-drop claim_activation_attempts saat gelombang
-- rename claim_delivery_*, dan v78 menciptakannya kembali sebagai
-- claim_delivery_activation_attempts — tanpa GRANT sehingga indicate_runtime tetap
-- ditolak. Migrasi ini memberikan (dan merapikan) grant yang kurang:
-- claim_delivery_activation_attempts (reconciler), hold_create/hold_list/
-- hold_release + erasure_request_create/erasure_request_list (panel moderasi),
-- audit_worm_fetch (ekspor WORM).
-- Pola mengikuti migrasi lama: REVOKE ALL FROM PUBLIC lalu GRANT ke indicate_runtime.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
REVOKE ALL ON FUNCTION indicate_private.claim_delivery_activation_attempts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_delivery_activation_attempts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.hold_create(uuid, text, uuid, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.hold_create(uuid, text, uuid, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.hold_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.hold_list(uuid) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.hold_release(uuid, text, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.hold_release(uuid, text, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.erasure_request_create(uuid, text, uuid, text, timestamptz, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.erasure_request_create(uuid, text, uuid, text, timestamptz, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.erasure_request_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.erasure_request_list(uuid) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.audit_worm_fetch(timestamptz, timestamptz, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.audit_worm_fetch(timestamptz, timestamptz, text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (82, 'function_grants_repair', 'sha256:0a309d26b79151a2697869f89de31d82fcf32056aebf350898a264c38b780c1f');
