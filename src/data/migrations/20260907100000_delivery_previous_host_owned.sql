-- F87: helper kepemilikan hostname sebelumnya yang hilang.
--
-- delivery.ts beginActivation memanggil
-- indicate_private.is_delivery_previous_host_owned(...) saat hostname site
-- berpindah, tetapi fungsi tersebut tidak pernah dibuat migrasi mana pun
-- (kelas yang sama dengan claim_delivery_activation_attempts pada v78):
-- aktivasi dengan previousHostname selalu gagal "function does not exist".
-- Semantik: true bila hostname sebelumnya masih tercatat pada site tersebut.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.is_delivery_previous_host_owned(p_organization_id uuid, p_site_id uuid, p_hostname text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sites
    WHERE organization_id = p_organization_id AND id = p_site_id AND normalized_hostname = p_hostname
  )
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.is_delivery_previous_host_owned(uuid, uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.is_delivery_previous_host_owned(uuid, uuid, text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (87, 'delivery_previous_host_owned', 'sha256:ec262e41300964c5b35a90452df2168982cfca6ae402d2c544d9a6dde5190129');
