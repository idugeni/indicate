-- Phase 7 migration integrity hardening.
-- Canonical body digest algorithm: normalize CRLF to LF, replace only the
-- checksum literal in the migration's unique self-registration row with the
-- stable checksum sentinel, then SHA-256 the complete UTF-8 migration file.
-- Migration 0000 has no registration and hashes its complete normalized file.
-- Missing, malformed, or duplicate required registrations fail closed.
WITH reviewed(version, name, checksum) AS (
  VALUES
    (1, 'phase2_core_schema', 'sha256:764efddc6939f7f70b9b4785d34bd2c8fb9446a7776882a4f9a39258e0370c19'),
    (2, 'phase2_security', 'sha256:d187379d73d8530491c07291e03645d966c3502fd59003ee3d081487ccc33612'),
    (3, 'phase2_publisher_actor_constraints', 'sha256:b65dea61b09170247f44aacbe52d3a7c6687495b1e2318394635a0ee17fe004e'),
    (4, 'phase2_authorization_hardening', 'sha256:d636b41314ba61c3ef3c886b01a6ef9e020614914cb8a752055167a6095dfc33'),
    (5, 'phase3_verified_user_context', 'sha256:ad79ad7685de14a73868c2403a78c6a5d3e495da33737bc98f197b18fe8219df'),
    (6, 'phase3_discovery_outcome_timestamp', 'sha256:10883f849abef3ddb2fcddd5a220f341203bdcf4485b7091f6f94d986071473c'),
    (7, 'phase4_media_publication_runtime', 'sha256:7390ee7325ab9676609742ec9945df0964c3e96f6a7f075d35d61dd9b7c824f8'),
    (8, 'phase5_public_delivery', 'sha256:e36dc3ee32ca440b97f0a0e6692b6e05b30206dd57cef78e16a69159f251b7dd'),
    (9, 'phase5_production_boundaries', 'sha256:70bd40399a4cf9758e9570c534420fc51cc3e87d2d3117503d9328f827540159'),
    (10, 'phase6_external_entrypoints', 'sha256:cb5c138af7c4182294bc54aee08134315c3e86517606ed462c254904f30d1ecd'),
    (11, 'phase6_security_hardening', 'sha256:8d33e5da644155416d28567a3992444834bb88613ab3c3457e8fca231fcebf96'),
    (12, 'phase6_strict_platform_authorization', 'sha256:0e9e078d1aec2aec90325ac809cc77aa99c62710322547b35be8191a1079042a'),
    (13, 'phase7_readiness_discovery', 'sha256:0fc0a7777f7e96a3dc1167b2f897fe3ca983c45d347352b2fa7fb532aca63993')
)
UPDATE public.indicate_schema_migrations applied
SET checksum = reviewed.checksum
FROM reviewed
WHERE applied.version = reviewed.version
  AND applied.name = reviewed.name;--> statement-breakpoint

DO $$
DECLARE matched integer;
BEGIN
  SELECT count(*) INTO matched
  FROM public.indicate_schema_migrations applied
  JOIN (VALUES
    (1, 'phase2_core_schema', 'sha256:764efddc6939f7f70b9b4785d34bd2c8fb9446a7776882a4f9a39258e0370c19'),
    (2, 'phase2_security', 'sha256:d187379d73d8530491c07291e03645d966c3502fd59003ee3d081487ccc33612'),
    (3, 'phase2_publisher_actor_constraints', 'sha256:b65dea61b09170247f44aacbe52d3a7c6687495b1e2318394635a0ee17fe004e'),
    (4, 'phase2_authorization_hardening', 'sha256:d636b41314ba61c3ef3c886b01a6ef9e020614914cb8a752055167a6095dfc33'),
    (5, 'phase3_verified_user_context', 'sha256:ad79ad7685de14a73868c2403a78c6a5d3e495da33737bc98f197b18fe8219df'),
    (6, 'phase3_discovery_outcome_timestamp', 'sha256:10883f849abef3ddb2fcddd5a220f341203bdcf4485b7091f6f94d986071473c'),
    (7, 'phase4_media_publication_runtime', 'sha256:7390ee7325ab9676609742ec9945df0964c3e96f6a7f075d35d61dd9b7c824f8'),
    (8, 'phase5_public_delivery', 'sha256:e36dc3ee32ca440b97f0a0e6692b6e05b30206dd57cef78e16a69159f251b7dd'),
    (9, 'phase5_production_boundaries', 'sha256:70bd40399a4cf9758e9570c534420fc51cc3e87d2d3117503d9328f827540159'),
    (10, 'phase6_external_entrypoints', 'sha256:cb5c138af7c4182294bc54aee08134315c3e86517606ed462c254904f30d1ecd'),
    (11, 'phase6_security_hardening', 'sha256:8d33e5da644155416d28567a3992444834bb88613ab3c3457e8fca231fcebf96'),
    (12, 'phase6_strict_platform_authorization', 'sha256:0e9e078d1aec2aec90325ac809cc77aa99c62710322547b35be8191a1079042a'),
    (13, 'phase7_readiness_discovery', 'sha256:0fc0a7777f7e96a3dc1167b2f897fe3ca983c45d347352b2fa7fb532aca63993')
  ) reviewed(version, name, checksum)
    ON applied.version = reviewed.version
   AND applied.name = reviewed.name
   AND applied.checksum = reviewed.checksum;
  IF matched <> 13 THEN
    RAISE EXCEPTION 'historical migration manifest mismatch';
  END IF;
END
$$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (14, 'migration_body_digests', 'sha256:81a82af6942df1ae906d6e3b76d4bd9906dfc5efb65cd30cb8e2aabd372c91a3');
