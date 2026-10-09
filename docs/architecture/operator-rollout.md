# AI Operator Control Plane

## Goal

Provide a safe, auditable way for authenticated operators to use AI across the 19 INDICATE dashboard domains.

## Execution contract

- Resolve the user and active organization on the server.
- Allow only registered tools with validated input and bounded output.
- Re-check permission for each action; use existing domain services.
- Begin read-only. Require explicit approval for destructive, publishing, access, billing, bulk, and cross-organization changes.
- Apply rate, cost, and timeout limits. Record redacted audit events.
- Verify every write by reading the resource back. Report uncertain outcomes honestly.

## Phases

1. Inventory all domains, routes, commands, permissions, and tests.
2. Ship a read-only registry and test malformed plans, denied actions, tenant isolation, and failure handling.
3. Add approved writes with expiring confirmation and replay protection.
4. Expand by domain with automated authorization and authenticated browser tests.
5. Roll out behind a feature flag with monitoring and rollback.

## Done means

Every advertised capability has a schema, permission checks, success/failure tests, and runtime evidence. The final release needs authenticated browser verification, monitoring, and rollback guidance; unit tests alone are insufficient.
