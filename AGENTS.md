<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Tool use (MCP + skills)

Use the connected tools when they help. Retrieval beats memory, but nothing here blocks progress.

- **CodeGraph**: preferred before grep/find/Read when indexed.
- **Supabase MCP**: recommended for database work. Inspect live state
  before writing a migration and verify with a test query after applying
  when possible; run `security` and `performance` advisors after DDL
  touching functions, triggers, or policies when possible. Prefer to apply
  soon after authoring, but an unapplied migration file is allowed as WIP.
- **cloudflare-docs MCP**: recommended before citing any Cloudflare limit,
  price, or API shape.
- **context7 MCP**: recommended before writing code against any library,
  framework, or SDK.
- **chrome-devtools MCP**: use to verify UI/rendering and web performance
  when useful, not mandatory.
- **Skills**: load via the skill tool when the task matches. Key triggers:
  any repo code → `indicate-conventions`; any Supabase work → `supabase`
  (+ `supabase-postgres-best-practices` for schema/SQL/RLS/index work);
  Drizzle ORM on Postgres → `drizzle-best-practices`; any Cloudflare
  task → `cloudflare`; Upstash Redis client work → `upstash-redis-js`;
  React/Next.js perf or composition → `vercel-react-best-practices` /
  `vercel-composition-patterns`; Vercel cost/perf → `vercel-optimize`;
  Telegram bot/webhook work → `telegram-bot-builder`;
  adding/provisioning/branding/SEO-filling tenant domains, sites, or
  regions (any count) → `tenant-onboarding`;
  SEO/sitemap/RSS/structured-data → `seo`;
  security audit/OWASP/secure coding → `code-security` (+ `semgrep` to run scans);
  UI styling or audits → `frontend-design`, `web-design-guidelines`,
  `web-perf`; file deliverables → `docx`, `pdf`, `xlsx`.
- **Behavior**: load `agent-discipline` for reply style, verification, and
  safe-refusal discipline (distilled third-party behavior file; repo docs
  win on conflict). Baseline even when the skill is skipped: reply concisely,
  verify against live state before asserting, and state the requested answer
  after the last tool call.
- **Generated files**: prefer not to hand-edit generated files
  (`src/data/migrations/bootstrap/indicate-schema.sql`), applied migrations,
  `src/data/migrations/meta/_journal.json`, snapshots, ledger digests. Prefer forward
  migrations for live fixes, but history edits are allowed in development
  with reviewer approval. There are no `db:*` workflows by default.

## Windows pwsh (WAJIB — bukan relaxed mode)

Shell berjalan di `win32` memakai `pwsh` 7 + GNU tools via
`C:\Program Files\Git\usr\bin` (sudah masuk User PATH: `head`, `tail`,
`sed`, `awk`, `grep`, `find` GNU tersedia; terminal baru perlu dibuka ulang
agar PATH berlaku). Via `choco`: `jq`, `yq`, `fd`, `fzf`, `wget`, `bat`,
`eza`, `less`. Via `scoop`: `supabase`, `7z`. Via `npm -g`: `vercel`,
`wrangler`. Redis via `memurai-cli.exe` (kompatibel RESP, pengganti
`redis-cli`). Python dilengkapi `uv`; `semgrep` biner sengaja tidak
dipasang (tunda sampai Python ≤3.13 atau jaringan membaik).

Preferensi owner: update FULL LATEST, dan bila ada kanal beta yang resmi
(mis. `supabase-beta`), pilih beta.

Tetap utamakan tools khusus dan jangan kembali ke kebiasaan Unix-mentah:

- Untuk baca/cari file hanya pakai `read` / `grep` / `glob`
  (`read` pengganti `cat`/`head`/`tail`, `grep` pengganti shell `grep`,
  `glob` pengganti `find`/`ls`).
- Untuk ubah file hanya pakai `edit` / `write`, bukan `sed`/`awk`/`echo >`.
- `shell` hanya untuk perintah sistem; sintaks `pwsh` diutamakan, contoh:
  `Get-Content <file> -TotalCount 50` sebagai pengganti `head -50 <file>`.
  GNU `head`/`tail` hanya sebagai fallback.

## Komentar & impor (WAJIB — bukan relaxed mode)

Bagian ini mengikat setiap agen AI dan manusia. Tidak dicover oleh
"relaxed mode" di bawah. Langgar = perbaiki sebelum selesai.

### 1. Wajib baca sebelum coding

1. Baca bagian ini + skill `indicate-conventions` sebelum menyentuh
   `src/**`. Jangan mengandalkan ingatan.
2. Anggap aturan ini sebagai definition-of-done: tugas belum selesai
   selama masih ada komentar sampah atau impor relatif yang seharusnya `@/`.

### 2. Nol komentar sampah (default: jangan berkomentar)

Komentar yang dilarang dan wajib dihapus saat ditemukan (termasuk di file
yang tidak kamu ubah tapi kamu sentuh alurnya):

- Kode yang dikomentari (`// const x = ...`, `/* ... */` berisi kode).
- Komentar redundan yang hanya mengulang nama simbol
  (`// get user by id` di atas `getUserById`, `// component for X`).
- Narasi AI/slop: `// This function...`, `// Below we...`, `// First...`,
  divider (`// ===`, `// ---`, `// ***`), emoji, permintaan maaf, log perubahan.
- `TODO`/`FIXME`/`HACK` tanpa tiket: wajib bentuk
  `TODO(<issue-or-owner>): <aksi spesifik>` atau jangan tulis sama sekali.
- `console.log`/`debugger` yang tertinggal, `// eslint-disable` tanpa alasan
  spesifik per baris.
- JSDoc kosong atau satu baris tanpa informasi
  (`/** TODO */`, `/** helper */`, `@param x x`).

Prinsip: kode harus self-explanatory (nama jelas, tipe ketat, fungsi kecil).
Komentar hanya untuk **mengapa**, bukan **apa**.

### 3. Jika berkomentar: wajib gaya TypeDoc/TSDoc

Hanya boleh berkomentar untuk public API yang diekspor (fungsi, kelas,
tipe, hook, route handler, adapter) bila perilakunya tidak jelas dari
tanda tangan. Format satu-satunya yang diterima:

```ts
/**
 * Menghitung kuota publikasi tersisa untuk satu organisasi.
 *
 * @param organizationId - ID organisasi tenant (sudah terotorisasi).
 * @param now - Waktu acuan; default `new Date()` di production.
 * @returns Sisa kuota; tidak pernah negatif.
 * @throws {QuotaError} Jika snapshot kuota tidak ditemukan.
 * @example
 * ```ts
 * const sisa = await sisaKuota(orgId);
 * ```
 */
export async function sisaKuota(organizationId: string, now = new Date()): Promise<number>
```

Aturan gaya:

- Selalu `/** ... */` (bukan `//`) untuk dokumentasi API; kalimat pertama
  adalah ringkasan imperatif satu baris.
- Tag yang dipakai hanya yang baku TypeDoc: `@param`, `@returns`,
  `@throws`, `@example`, `@remarks`, `@deprecated` (dengan pengganti).
  Dilarang tag bebas (`@note`, `@author`, `@todo`).
- Tulis tipe di signature TypeScript, jangan diulang di teks tag
  (tulis `@param organizationId - ...`, bukan `@param {string}`).
- Bahasa konsisten dengan file (repo ini Inggris untuk kode); satu gaya
  per file.
- Self-healing: jika menemukan komentar non-TypeDoc di file yang kamu
  ubah, ubah ke format di atas bila memang dibutuhkan, atau hapus bila
  sampah. Jangan biarkan lolos dengan alasan "bukan saya yang menulis".

### 4. Impor: maksimalkan `@/`

- Semua impor lintas direktori wajib memakai alias `@/` (mis.
  `@/modules/publishing/publication-policy`,
  `@/core/errors/deny`, `@/data/client`).
- Impor relatif (`../`, `./`) dilarang kecuali re-ekspor barrel
  satu direktori yang sama (`export ... from './x'` di `index.ts`) atau
  impor sibling sedirektori yang memang ko-lokated. Tidak ada `../` untuk
  keluar dari modul.
- Jangan impor modul non-barrel lewat specifier telanjang
  (`@/modules/publishing` dilarang kecuali `dashboard`, `delivery`,
  `integrations` yang memang punya `index.ts`); impor lewat path file.
- Urutan impor: eksternal → `@/` → relatif-sedirektori; ESLint
  (`no-restricted-imports`) melarang `../` —
  `npm run lint` harus hijau (`--max-warnings=0`).
- Self-healing: jika file yang kamu sentuh masih memakai `../` yang bisa
  diganti `@/`, migrasikan dalam PR yang sama.

## MCP + Skills discovery (mandatory, not advisory)

This section is mandatory and is not covered by relaxed mode. Every agent
must follow it before answering MCP/integration questions or writing code:

1. Discover runtime MCPs first with `opencode mcp list`, then compare with
   `.mcp.json`, `opencode.jsonc`, and global `~/.config/opencode/opencode.json`.
   Repo files alone are not the source of truth (global config merges at runtime).
   `.mcp.json` is the canonical repo declaration; `opencode.jsonc` mirrors it
   and `.vscode/mcp.json` is editor-local convenience only.
2. Any claim about "already connected / not yet present" must cite the runtime
   source. Never recommend an MCP that is already connected.
3. Load the matching skill via the `skill` tool before working (repo code →
   `indicate-conventions`, plus triggers listed above). Do not code against a
   library/integration without its skill when one exists.
4. If `.mcp.json` vs `opencode.jsonc` vs runtime diverge, report the drift
   explicitly before proceeding.

## Owner overrides (rules stay flexible)

No rule in this file overrules an explicit owner instruction — these
rules constrain the agent's defaults and initiative, never the owner's
taste. When the owner changes requirements:

1. Adjust first, docs may follow: code the change, then update the
   governing docs (`docs/PRD.md`,
   `docs/ARCHITECTURE.md`, `docs/MIGRATIONS.md`, this file) in the same
   PR when practical. Docs are advisory, not a pre-code gate.
2. Changed mind on a standing decision below? Update or remove that
   entry in the same turn — do not keep enforcing a revoked decision.
3. When in doubt between a rule and an explicit owner request, follow
   the request and record the deviation briefly.

## Standing decisions (relaxed mode — advisory only)

Relaxed by owner on 2026-09-14 ("longgar penuh"). All items below are
advisory, not blocking. Do not fail a stage, PR, or promotion solely on
these grounds; warn once at most and proceed:

1. Bootstrap regeneration is allowed in development with reviewer approval.
   `src/data/migrations/bootstrap/indicate-schema.sql` may be regenerated
   from hand-authored files; fresh environments may build from bootstrap
   or from hand-authored files in filename order.
2. The `Drill Expire` organization may be reactivated in development for
   testing, with a fresh backup first; production reactivation still needs
   explicit owner approval.
3. The migration gate (`migration_gate_events.required_version`) may be
   armed or adjusted whenever the release needs it — no promotion-checklist
   restriction. See docs/MIGRATIONS.md (advisory).
