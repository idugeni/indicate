-- F81: pengetatan SELECT baris global NULL (PENDING A3) + akses WORM.
--
-- Audit rollout: tidak ada kode aplikasi yang membaca langsung ketiga tabel ini
-- (semua lewat fungsi SECURITY DEFINER; satu-satunya pembaca langsung adalah
-- ekspor WORM yang kini lewat audit_worm_fetch di bawah). Maka klausa
-- OR organization_id IS NULL pada kebijakan SELECT dicabut:
-- indicate_runtime hanya melihat baris tenant-nya sendiri.
CREATE OR REPLACE FUNCTION indicate_private.audit_worm_fetch(p_since timestamp with time zone, p_until timestamp with time zone, p_table text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF p_table = 'audit_logs' THEN
    RETURN QUERY SELECT to_jsonb(a) FROM public.audit_logs a
    WHERE a.occurred_at >= p_since AND a.occurred_at < p_until ORDER BY a.occurred_at, a.id;
  ELSIF p_table = 'runtime_config_audit_logs' THEN
    RETURN QUERY SELECT to_jsonb(a) FROM public.runtime_config_audit_logs a
    WHERE a.occurred_at >= p_since AND a.occurred_at < p_until ORDER BY a.occurred_at, a.id;
  ELSIF p_table = 'retention_runs' THEN
    RETURN QUERY SELECT to_jsonb(a) FROM public.retention_runs a
    WHERE a.started_at >= p_since AND a.started_at < p_until ORDER BY a.started_at, a.id;
  ELSE
    RAISE EXCEPTION 'worm table not allowed' USING ERRCODE = '42501';
  END IF;
END
$function$;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_select ON public.runtime_config_audit_logs;--> statement-breakpoint
CREATE POLICY runtime_config_audit_tenant_isolation_select ON public.runtime_config_audit_logs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_select ON public.runtime_config_invalidation_intents;--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_isolation_select ON public.runtime_config_invalidation_intents FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_select ON public.webhook_replay_claims;--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_isolation_select ON public.webhook_replay_claims FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (81, 'rls_global_select_tightening', 'sha256:9238a2d15b91e9887e8f4a84cee26278ee35c3ee42d07dd171faf61b9864b091');
