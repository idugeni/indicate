-- Normalisasi logo publisher lintas-host ke path relatif satu-host.
--
-- Separuh baris menyimpan fallback sebagai URL absolut control-plane
-- (https://indicate.web.id/brand/...) sehingga <img> dan logo JSON-LD
-- penerbit menunjuk lintas host; kembalikan ke path relatif agar
-- di-re-anchor ke hostname tenant yang meminta.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

UPDATE public.publishers SET contacts = contacts || jsonb_build_object('logoUrl', '/' || split_part(contacts ->> 'logoUrl', 'indicate.web.id/', 2)), updated_at = now() WHERE (contacts ->> 'logoUrl') LIKE 'https://indicate.web.id/brand/%' OR (contacts ->> 'logoUrl') LIKE 'https://indicate.web.id/assets/%';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (143, 'publisher_logo_single_host', 'sha256:5c4a1186143f4b1ac8da08448ca4e3486ce03e41b9e2b2ba596e79c8ed614227');
