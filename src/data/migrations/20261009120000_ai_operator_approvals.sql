-- Persisted AI Operator approvals; approval is bound to an exact command hash.
CREATE TYPE public.ai_operator_approval_state AS ENUM ('pending', 'approved', 'rejected', 'consumed', 'expired');--> statement-breakpoint
CREATE TABLE public.ai_operator_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  requester_actor_id text NOT NULL,
  approver_actor_id text,
  tool_id text NOT NULL,
  command_input jsonb NOT NULL,
  command_hash text NOT NULL,
  state public.ai_operator_approval_state NOT NULL DEFAULT 'pending',
  idempotency_key text NOT NULL,
  decision_note text,
  expires_at timestamptz NOT NULL,
  approved_at timestamptz,
  rejected_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_operator_approvals_command_hash_check CHECK (length(command_hash) = 64),
  CONSTRAINT ai_operator_approvals_tool_id_check CHECK (length(tool_id) BETWEEN 1 AND 120),
  CONSTRAINT ai_operator_approvals_actor_ids_check CHECK (length(requester_actor_id) BETWEEN 1 AND 200 AND (approver_actor_id IS NULL OR length(approver_actor_id) BETWEEN 1 AND 200)),
  CONSTRAINT ai_operator_approvals_idempotency_check CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  CONSTRAINT ai_operator_approvals_input_object_check CHECK (jsonb_typeof(command_input) = 'object'),
  CONSTRAINT ai_operator_approvals_decision_state_check CHECK (
    (state = 'pending' AND approver_actor_id IS NULL AND approved_at IS NULL AND rejected_at IS NULL AND consumed_at IS NULL)
    OR (state = 'approved' AND approver_actor_id IS NOT NULL AND approved_at IS NOT NULL AND rejected_at IS NULL AND consumed_at IS NULL)
    OR (state = 'rejected' AND approver_actor_id IS NOT NULL AND approved_at IS NULL AND rejected_at IS NOT NULL AND consumed_at IS NULL)
    OR (state = 'consumed' AND approver_actor_id IS NOT NULL AND approved_at IS NOT NULL AND consumed_at IS NOT NULL AND rejected_at IS NULL)
    OR (state = 'expired' AND consumed_at IS NULL)
  )
);--> statement-breakpoint
CREATE UNIQUE INDEX ai_operator_approvals_idempotency_unique ON public.ai_operator_approvals (organization_id, requester_actor_id, idempotency_key);--> statement-breakpoint
CREATE INDEX ai_operator_approvals_org_state_created_idx ON public.ai_operator_approvals (organization_id, state, created_at DESC);--> statement-breakpoint
CREATE INDEX ai_operator_approvals_expiry_idx ON public.ai_operator_approvals (state, expires_at);--> statement-breakpoint
INSERT INTO public.permission_definitions(scope, name, description, sort_order)
VALUES ('organization', 'ai_operator.approve', 'Approve or reject AI Operator commands for this organization.', 900)
ON CONFLICT (scope, name) DO UPDATE SET description = EXCLUDED.description;--> statement-breakpoint
INSERT INTO public.permissions(id, organization_id, name, scope, description)
SELECT gen_random_uuid(), o.id, 'ai_operator.approve', 'organization', 'Approve or reject AI Operator commands for this organization.'
FROM public.organizations AS o
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (277, 'ai_operator_approvals', 'sha256:447f898ab308a00a1cb1601fe2f807cf7fcf6c99d3e663de3f98e11e5472a967');
