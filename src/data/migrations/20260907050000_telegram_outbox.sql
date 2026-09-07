-- F83: antrean keluar Telegram + broadcast (PENDING A5).
--
-- deliverReplies selama ini hanya me-log gagal kirim (balasan hilang). Kini
-- kegagalan dipersist ke telegram_outbox dengan backoff + hormat retry_after,
-- diproses worker drain harian; broadcast platform mengantrekan satu pesan ke
-- semua mapping aktif. Function-only untuk tulis/baca antrean (RLS
-- enabled+forced, tanpa grant tabel ke indicate_runtime); worker claim/ack dan
-- enqueue diberikan ke runtime mengikuti pola claim_* yang ada.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TABLE public.telegram_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chat_id text NOT NULL CHECK (length(chat_id) BETWEEN 1 AND 100),
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_error text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX telegram_outbox_due_idx ON public.telegram_outbox (status, next_attempt_at);--> statement-breakpoint
ALTER TABLE public.telegram_outbox ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.telegram_outbox FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.outbox_enqueue(p_organization_id uuid, p_chat_id text, p_text text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_chat_id IS NULL OR length(p_chat_id) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'outbox chat invalid' USING ERRCODE = '42501';
  END IF;
  IF p_text IS NULL OR length(p_text) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'outbox text invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.telegram_outbox(id, organization_id, chat_id, text, status, attempts, next_attempt_at, created_at, updated_at)
  VALUES (v_id, p_organization_id, p_chat_id, p_text, 'pending', 0, p_now, p_now, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.outbox_claim(p_now timestamp with time zone, p_limit integer)
 RETURNS SETOF telegram_outbox
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.telegram_outbox
    WHERE status = 'pending' AND next_attempt_at <= p_now
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 50))
  )
  UPDATE public.telegram_outbox row SET status = 'sending', updated_at = p_now
  FROM candidates WHERE row.id = candidates.id
  RETURNING row.*;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.outbox_ack(p_id uuid, p_ok boolean, p_retry_after integer, p_error text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_attempts integer;
BEGIN
  SELECT attempts INTO v_attempts FROM public.telegram_outbox WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_ok THEN
    UPDATE public.telegram_outbox SET status = 'sent', last_error = NULL, updated_at = p_now WHERE id = p_id;
    RETURN true;
  END IF;
  IF v_attempts + 1 >= 8 THEN
    UPDATE public.telegram_outbox SET status = 'dead', attempts = attempts + 1, last_error = p_error, updated_at = p_now WHERE id = p_id;
    RETURN true;
  END IF;
  UPDATE public.telegram_outbox
  SET status = 'pending', attempts = attempts + 1, last_error = p_error,
      next_attempt_at = p_now + make_interval(secs => LEAST(GREATEST(COALESCE(p_retry_after, 0), 60 * (2 ^ LEAST(v_attempts, 5)))::integer, 21600)),
      updated_at = p_now
  WHERE id = p_id;
  RETURN true;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.outbox_broadcast_targets(p_actor_id uuid)
 RETURNS TABLE(organization_id uuid, chat_id text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT DISTINCT m.organization_id, m.telegram_chat_id
  FROM public.telegram_identity_mappings m WHERE m.status = 'active' ORDER BY m.organization_id, m.telegram_chat_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.outbox_enqueue(uuid, text, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.outbox_enqueue(uuid, text, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.outbox_claim(timestamptz, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.outbox_claim(timestamptz, integer) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.outbox_ack(uuid, boolean, integer, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.outbox_ack(uuid, boolean, integer, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.outbox_broadcast_targets(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.outbox_broadcast_targets(uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (83, 'telegram_outbox', 'sha256:9202019251aac5d50fcd943ab37072cc5e4f94c53f9d9e8055281608b0355bf8');
