<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Tool use (MCP + skills)

Maximize the connected tools whenever relevant. Retrieval beats memory.

- **CodeGraph**: per the section above — always before grep/find/Read.
- **Supabase MCP**: mandatory for any database work. Inspect live state
  (columns, functions, ledger, RLS, extensions) *before* writing a
  migration; verify with a test query *after* applying; run `security`
  and `performance` advisors after DDL touching functions, triggers, or
  policies. Apply, don't just write: every schema change must be executed
  against Supabase via MCP in the same turn it is authored, then verified
  live — never leave a migration file unapplied. Never declare a live
  check impossible without attempting the tool first — then report the
  exact boundary found.
- **cloudflare-docs MCP**: mandatory before citing any Cloudflare limit,
  price, or API shape. Docs beat training data.
- **context7 MCP**: mandatory before writing code against any library,
  framework, or SDK (resolve the library ID first).
- **chrome-devtools MCP**: use to verify UI/rendering and web performance
  instead of asserting from code alone.
- **Skills**: load via the skill tool when the task matches. Key triggers:
  any repo code → `indicate-conventions`; any Supabase work → `supabase`
  (+ `supabase-postgres-best-practices` for schema/SQL/RLS/index work);
  Drizzle ORM on Postgres → `drizzle-best-practices`; any Cloudflare
  task → `cloudflare`; Upstash Redis client work → `upstash-redis-js`;
  React/Next.js perf or composition → `vercel-react-best-practices` /
  `vercel-composition-patterns`; Vercel cost/perf → `vercel-optimize`;
  UI styling or audits → `frontend-design`, `web-design-guidelines`,
  `web-perf`; file deliverables → `docx`, `pdf`, `xlsx`.
- **Never by hand**: generated files (`bootstrap/indicate-schema.sql`),
  applied migrations, `meta/_journal.json`, snapshots, ledger digests.
  Forward-only: fix live issues with a new migration, never by editing
  history. Never invent `db:*` workflows; the repo has none.

## Owner overrides (rules stay flexible)

No rule in this file overrules an explicit owner instruction — these
rules constrain the agent's defaults and initiative, never the owner's
taste. When the owner changes requirements:

1. Adjust first, then propagate: update the governing docs *before*
   coding the change (`docs/PRD.md`, `docs/DESIGN.md`,
   `docs/ARCHITECTURE.md`, `docs/MIGRATIONS.md`, this file). A new
   pattern belongs in its document first, not improvised in code.
2. Changed mind on a standing decision below? Update or remove that
   entry in the same turn — do not keep enforcing a revoked decision.
3. When in doubt between a rule and an explicit owner request, follow
   the request and record the deviation briefly.

## Standing decisions (do not re-raise)

Owner-settled items. Do not propose, revisit, or warn about these again
unless the owner explicitly reopens them:

1. No bootstrap regeneration workflow. There is no `db:bootstrap` script
   and no `scripts/regenerate-bootstrap.py` by decision; the generated
   `src/data/migrations/bootstrap/indicate-schema.sql` stays at the
   team-maintained 41-migration baseline. Fresh environments are built
   from the hand-authored files in filename order, never from bootstrap.
2. The `Drill Expire` organization stays `cancelled`/expired. It is an
   intentional expiry-drill fixture; reactivating it would destroy test
   data and fabricate billing entitlement.
3. The migration gate stays disarmed until production promotion. Do not
   propose inserting `migration_gate_events.required_version` outside
   the promotion checklist (docs/MIGRATIONS.md step 4).
