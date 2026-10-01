<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Division of labour

This file is the rulebook: every rule that binds a change in this repository
lives here. [`CLAUDE.md`](CLAUDE.md) is the reference card beside it — route
groups, path aliases, file naming, commands, the config map — and deliberately
holds no rules. Keep it that way: a rule stated in two files is a rule that will
disagree with itself, and the disagreement ships. When a change touches code
shape, update the card; when it touches a rule, update this file.

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
- **cloudflare-api MCP**: use for live zone, DNS, and account inspection;
  pair with the `cloudflare` skill for implementation patterns.
- **context7 MCP**: recommended before writing code against any library,
  framework, or SDK.
- **sequential-thinking MCP**: use to break down complex architecture or
  debugging questions before answering.
- **exa MCP**: use for live web search and page fetch when Context7 or
  vendor docs are insufficient.
- **chrome-devtools MCP**: use to verify UI/rendering and web performance
  when useful, not mandatory.
- **next-devtools MCP**: use for Next.js App Router diagnostics alongside
  browser verification.
- **webmcp MCP**: use for browser-side automation flows when
  `chrome-devtools MCP` alone is insufficient.
- **vercel MCP**: use to inspect project and deployment state before changing
  hosting config; pair with `vercel-optimize` and
  `vercel-react-best-practices` skills. **Always pass `teamId` explicitly**
  (`team_HvgOzoFV92X1vjzqQkczC8kK`, slug `safenca`). The OAuth grant covers
  several accounts, so the default scope resolves to
  `team_PRHMAl57mntpvsb8t4LETyAA`, which does not own `indicate`:
  `list_projects()` with no `teamId` returns six unrelated projects (irnk,
  sipeternak, ...) and that is not a sign the MCP is broken. Access itself is
  intact, since `get_team({ teamId })` and `filter_project_envs({ idOrName:
  "indicate", teamId })` both succeed. The `vercel` CLI with `--scope` and the
  REST API with `?teamId=` share the same pitfall, so cross-check all three
  sources before calling an environment complete.
- **upstash-redis MCP**: repo-declared in `.mcp.json`/`opencode.jsonc` with
  credentials from git-ignored `.env` (`UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`); use to inspect live cache and queue state.
  Redis is acceleration only, never durable authority; pair with the
  `upstash-redis-js` skill for client code.
- **resend MCP**: use for email delivery inspection and debugging; never log
  API keys or PII.
- **Skills**: load via the skill tool when the task matches. Key triggers:
  any repo code → `indicate-conventions`; any Supabase work → `supabase`
  (+ `supabase-postgres-best-practices` for schema/SQL/RLS/index work);
  any repository, query, cache, cron, or data-access change → read
  `AGENTS.md` "Database access & egress" (WAJIB) before writing code;
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

## Gambar (biaya Vercel)

Seluruh gambar wajib tanpa optimasi Vercel agar tidak ada biaya
transformasi `/_next/image`:

1. `next.config.ts` wajib `images.unoptimized: true` — saklar global,
   tidak boleh dimatikan tanpa persetujuan owner.
2. Setiap `<Image>` dari `next/image` wajib prop `unoptimized`
   (pertahanan lapis kedua bila saklar global berubah).

## Hover hint (WAJIB — bukan relaxed mode)

Petunjuk hover memakai tooltip shadcn (`@/components/ui/tooltip`), tidak
pernah atribut `title` bawaan browser.

1. `title` pada elemen DOM adalah **error** (`tooltip/no-native-tooltip` dari
   `scripts/eslint/no-native-tooltip.mjs`, didaftarkan di `eslint.config.mjs`
   sebagai `indicate/tooltip`).
2. Komponen kapital hanya diperiksa bila ia meneruskan props ke DOM; daftar
   bawaannya ada di `DEFAULT_DOM_FORWARDING` dan itu tempat resmi untuk
   menambah cakupan. Properti `title` yang isi konten — `SectionCard`,
   `EmptyState`, `PageHeader`, `OgCard`, `TopRanked`, `Donut`,
   `ArticleGallery` — bukan tooltip dan tidak boleh dibungkus.
3. Sisi publik memakai `TemplateTooltip`
   (`@/modules/site/components/network/ui/template-tooltip`) dengan trigger
   lewat `children`, supaya komponen server tidak mengirim elemen `render`
   melewati batas RSC. Sisi app memakai `Tooltip` + `TooltipTrigger
   render={<Button ... />}` langsung.
4. Warna chip bukan satu string yang disalin: `APP_TOOLTIP_CONTENT` dan
   `TEMPLATE_TOOLTIP_CONTENT` di `@/ui/tooltip`.
5. Kontrol icon-only **wajib** punya `aria-label` eksplisit. Tooltip bukan
   pengganti accessible name; `title` yang lama sering menjadi satu-satunya
   nama yang terbaca screen reader.
6. Batas yang diketahui: spread (`<div {...props} />`) tidak terdeteksi tanpa
   informasi tipe.

## Komit (WAJIB — bukan relaxed mode)

Bagian ini mengikat setiap agen AI dan manusia. Tidak dicover oleh
"relaxed mode" di bawah. Langgar = perbaiki sebelum push; histori yang
sudah ter-push tidak ditulis ulang tanpa persetujuan owner.

1. Baca standar pesan commit di `CONTRIBUTING.md` ("Commit messages")
   sebelum membuat commit. Jangan mengandalkan ingatan.
2. Format satu-satunya: `<tipe>[scope opsional]: <deskripsi>` — deskripsi
   Bahasa Inggris, huruf kecil, imperatif, maks 72 karakter, tanpa titik
   akhir, tanpa emoji. Tipe hanya huruf kecil: `feat`, `fix`, `refactor`,
   `docs`, `test`, `chore`, `perf`, `ci`, `build`.
3. Satu commit = satu perubahan logis. Dilarang commit snapshot, `wip`,
   `update`, `fix bug`, atau pesan asal-asalan; dilarang campur
   `feat` + `fix` + `refactor` dalam satu commit.
4. Selalu `git commit -s` (DCO `Signed-off-by`); cantumkan
   `Refs: #...` / `Fixes: #...` bila ada tiket.
5. Verifikasi sebelum commit: `npm run typecheck`, `npm run lint`, test
   terdampak, dan telaah `git status` / `git diff` — tanpa secrets,
   tanpa `.env*`, tanpa file generated yang tidak disengaja.
6. Definition-of-done commit: pesan lolos standar + gate hijau di atas.

## Definition of done — push (WAJIB — bukan relaxed mode)

Setiap push ke remote wajib lolos gerbang ini berurutan. Langgar = perbaiki
sebelum push berikutnya; histori yang sudah ter-push tidak ditulis ulang
tanpa persetujuan owner.

1. `npm run typecheck`, `npm run lint`, test terdampak: hijau lokal.
2. Bila menyentuh database: migrasi forward + entri jurnal + digest
   (`migration-digest.test`) hijau, `npm run db:bootstrap` +
   `db:bootstrap:check` hijau, file migrasi LF, lalu advisors `security` dan
   `performance` bersih dari temuan baru (yang tersisa dijelaskan tertulis).
3. `git status` ditelaah baris per baris sebelum `git add`: jangan sapu file
   sesi lain (`git add -A` buta dilarang bila pohon dipakai bersama).
4. Setelah push: pantau run CI sampai hijau; merah = perbaiki atau revert
   di giliran berikutnya, bukan dibiarkan.

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

## Angka (WAJIB — bukan relaxed mode)

Bagian ini mengikat setiap agen AI dan manusia. Tidak dicover oleh "relaxed
mode" di bawah. Langgar = angka tidak layak dipercaya sebelum diulang.

1. Setiap angka yang dipakai untuk mengambil keputusan wajib menyebut tiga
   hal: **apa** yang dihitung, **berapa** yang benar-benar terpakai, dan
   apakah itu *provisioned* atau *observed*. `4422 portal` tanpa `144 yang
   pernah serves` adalah angka yang belum selesai.
2. **Jangan melakukan aritmetika kapasitas pada angka provisioned.** Row
   count dari tabel `sites`, `domains`, `regions`, atau `media` menjawab
   "berapa yang dialokasikan", bukan "berapa yang hidup". Mengali
   provisioned count dengan biaya per-unit menghasilkan proyeksi yang
   terlihat presisi dan benar-benar salah.
3. Untuk setiap count di atas 100 yang relevan, jalankan probe pemakaian
   sebelum mengutip: sudah pernah terpakai atau belum. Pemprobean yang
   sering menangkapnya adalah `article_sites.state = 'published'`,
   `view_count = 0`, dan sebaran geografi.
4. Angka yang berasal dari satu eksekusi query tidak boleh dirangkum ulang
   dengan satuan berbeda. `count(*)` dari `sites` tetap `sites`, bukan
   "portal yang tayang" dan bukan "domain yang aktif".
5. **Tulis angka tanpa pemisah ribuan.** `4422`, bukan `4.422` dan bukan
   `4,422`. Titik dan koma sama-sama dipakai sebagai desimal di dalam
   dokumen teknis ini, jadi pemisah ribuan membuat satu angka bisa dibaca
   sebagai dua. Format ini berlaku di markdown, komentar, dan pesan commit.
6. Untuk skala portal dan geografi, jalankan audit yang sudah ada alih-alih
   menyusun query sendiri:

   ```text
   ORG_ID=<uuid> npm run hygiene:network
   ```

   Script read-only (`scripts/db-network-coverage.mjs`) mencetak coverage
   provisioned vs serving, jumlah kota/provinsi, bentuk hostname apex, dan
   apakah `view_count` observed atau seeded. `hygiene:publishers` audited
   markup penerbit dengan pola yang sama.

## Database access & egress (WAJIB — bukan relaxed mode)

Bagian ini mengikat setiap agen AI dan manusia sebelum **membuat,
memodifikasi, menyetujui, atau mereview** kode yang menyentuh database.
Tidak dicover oleh "relaxed mode" di bawah. Sumber faktualnya ada di
`docs/architecture.md` §13.4 (egress budget) dan `docs/architecture-rules.md`
§5 (runbook operasional); **bagian ini adalah kanon kebijakan, kedua
dokumen itu merujuk ke sini, bukan sebaliknya.**

### 0. Premis

- **PostgreSQL/Supabase adalah source of truth, bukan read-distribution
  layer.** Bytes yang keluar dari database adalah konsumsi kuota, bukan
  harga delivering. Setiap baris yang keluar tanpa filter adalah ciri bug,
  bukan gaya penulisan.
- Plan Free memakai kuota egress terpadu 5 GB yang dipakai bersama
  Database, Auth, dan Shared Pooler. Melampaui kuota memasukkan organisasi
  ke grace period, jadi ini **budget availability**, bukan baris biaya.
- Prinsip default, berlaku bila tidak ada alasan teknis tertulis:
  **READ LESS · FETCH ONCE · QUERY BY SCOPE · PAGINATE EVERYTHING THAT
  CAN GROW · CACHE APPROPRIATELY · NEVER FULL-TABLE DUMP**

### 1. Larangan keras

1. **DILARANG** `SELECT` tanpa scope/filter pada tabel yang dapat tumbuh.
2. **DILARANG** `SELECT *` (Drizzle `transaction.select()` tanpa projection)
   pada application hot path.
3. **DILARANG** full-table dump untuk hydration, snapshot, diff,
   reconciliation, indexing, cache warming, comparison, dashboard, cron,
   cold start, atau background job. Tidak ada pengecualian "cuma dev".
4. **DILARANG** mengambil seluruh tenant lalu memfilter di memory. Query
   tenant WAJIB terikat pada `organizationId` / `siteId` / `tenantId` atau
   business scope yang relevan.
5. **DILARANG** menarik ribuan baris untuk memakai sebagian kecil. Kalau
   consumer butuh 8 baris, query harus mengembalikan 8 baris.
6. **DILARANG** N+1. Pakai `join`, batched query, atau read model.
7. **DILARANG** fetch duplikat dalam satu request ketika data sudah tersedia
   dari request context, hasil repository, React `cache()`, memoization,
   Redis, atau layer cache lain.
8. **DILARANG** full read (tanpa pagination/filter) untuk data besar di hot
   path: `audit_logs`, history, events, jobs, invalidation records,
   operational logs, dan seluruh tenant-wide collection.
9. **DILARANG** connection churn: jangan buka koneksi PostgreSQL baru yang
   tidak perlu. Pakai pooler + reuse dengan konfigurasi yang sesuai.
10. **DILARANG** polling agresif bila event-driven, cache, atau interval
    yang masuk akal sudah tersedia.

### 2. Bentuk query yang wajib

- **Projection minimum.** Setiap query mengambil kolom minimum yang benar
  benar dibutuhkan. `colors`, `social_links`, `seo`, `navigation` (JSONB) dan
  `before`/`after` (JSONB) adalah byte mahal — jangan ikut terbawa oleh
  `SELECT *`.
- **Pagination wajib** untuk setiap collection/list yang dapat bertambah:
  cursor/keyset pagination, `LIMIT` yang punya justifikasi tertulis, atau
  filter berbasis tenant/site/org/state/time. Pilihannya, bukan opsional.
- **Diff dan agregasi di SQL**, bukan load-everything → process-in-memory →
  persist. Kalau persisannya bisa jadi `INSERT ... ON CONFLICT`,
  `UPDATE ... FROM`, `DELETE ... WHERE`, atau window function, tulis itu.
- **Dashboard/API/repository memakai projection per view atau use-case.**
  Jangan memuat seluruh tabel hanya karena satu consumer butuh sebagian
  kecil. Kalau butuh judul saja, pakai ringkasan; kalau butuh satu tenant
  record, pakai satu tenant record.
- **Multi-tenant config/read-model:** jangan reload seluruh `sites` /
  `site_settings` pada request atau cold start bila incremental read,
  shared cache, atau per-site cache bisa dipakai.
- **Cron dan background job** wajib punya scope bounded, frequency
  justification, idempotency, dan query terbatas. Scan penuh berulang
  tanpa alasan eksplisit plus evidence dilarang.
- **Media/file/image delivery** tidak boleh melakukan DB lookup per request
  bila object bisa disajikan langsung lewat R2/CDN. Database tidak boleh
  menjadi bottleneck delivery untuk asset yang pemetaannya deterministik.
- **Kolom katalog dibaca, bukan ditebak.** Sebelum menyebut kolom pada
  `information_schema`, `pg_*`, atau tabel yang belum pernah disentuh di sesi
  ini, baca dulu definisinya: `select column_name from information_schema.columns where table_schema='public' and table_name=...`. Menebak nama kolom adalah sumber kegagalan paling sering di query inspeksi, dan tiap tebakan salah adalah satu eksekusi server-side yang tetap menghabiskan kuota.
- **Query gagal diubah bentuknya, bukan diulang.** Retry dengan query yang sama atau sepele beda bukan diagnosa: ia membayar eksekusi kedua untuk jawaban yang sama. Setelah satu kegagalan, ubah strukturnya — `pg_proc`/`pg_views` sebagai tool terpisah, `pg_depend` untuk dependensi, `information_schema` untuk bentuk — atau berhenti dan laporkan. Query inspeksi yang gagal diulang berulang kali adalah pemborosan kuota yang terlihat sebagai "MCP tidak stabil", padahal penyebabnya bentuk query.

### 3. Cache: syarat, bukan pembegoalan

Data relatif statis dan read-heavy boleh dilayani Upstash Redis, Next.js
Data Cache (`'use cache'` / `unstable_cache`), Cloudflare cache, atau read
model lain yang sudah tersedia di repo.

**Cache TIDAK BOLEH jadi alasan mempertahankan query database yang buruk
atau unbounded.** Sebelum mengandalkan cache, agent wajib memastikan:

1. hit benar-benar mencegah query DB (bukan hanya mencegah render);
2. fallback path tidak berubah menjadi full-table read;
3. TTL masuk akal dan freshness tetap dijamin oleh mekanisme yang sudah
   ada (mis. revision di dalam cache key, bukan jam);
4. scope cache key benar — tidak bocor lintas tenant/site;
5. invalidation path tersedia dan terbukti ada.

Cache yang tidak cukup juga bukan alasan: **jangan memindahkan seluruh
dataset ke Redis hanya demi mengurangi egress.** Minimalkan rows dan
columns dulu, baru cache read model yang memang cocok.

### 4. Metode berisiko tinggi

Repository method bernama `snapshot`, `load`, `readComplete`, `getAll`,
`listAll`, atau pola sejenis **diperlakukan sebagai HIGH RISK**. Sebelum
membuat atau memakainya, agent wajib memeriksa dan menuliskan:

- row count aktual (bukan asumsi) dan bytes/row;
- payload size per panggilan;
- caller graph (siapa memanggil, dari hot path mana);
- frequency per request dan frequency per instance;
- cold-start behavior;
- cron frequency bila dipanggil cron;
- estimasi production calls/day dan rows/day.

### 5. Gerbang perubahan database (wajib, sebelum implementasi)

Setiap perubahan data-access wajib menjalankan enam langkah ini dan
mencatat hasilnya di PR:

1. **IDENTIFY** — tabel, kolom, filter, expected rows, payload, frequency,
   callers.
2. **BOUND** — query dibatasi business scope + pagination.
3. **CACHE** — hanya bila langkah 1-2 tidak cukup dan syarat §3 terpenuhi.
4. **FREQUENCY** — trace seluruh caller termasuk cron dan cold start.
5. **VERIFY** — generated SQL, lalu `pg_stat_statements` / database logs /
   observability bila tersedia.
6. **BLOCK** — implementasi diblokir bila ditemukan unbounded full-table
   read atau large snapshot tanpa alasan kuat.

Sebelum melakukan perubahan, agent WAJIB membaca: schema, indexes,
repository callers, cache layer, invalidation mechanism, runtime behavior,
deployment model, dan production scale.

**Production scale adalah baseline.** Ukuran development/test tidak pernah
menjadi alasan bahwa sebuah query aman. Query yang sekarang kecil tetap
wajib dipaginate/filter bila dataset-nya dapat tumbuh tanpa batas.

### 6. Estimasi dan klaim

- Untuk setiap perubahan yang memengaruhi query volume, agent wajib
  memperkirakan **worst-case calls/day dan rows/day** serta mengidentifikasi
  sumber egress potensial **sebelum** implementasi.
- Bila estimasi menunjukkan peningkatan query count, rows returned,
  connection count, payload size, atau egress, **treat as regression sampai
  terbukti sebaliknya.**
- Agent **DILARANG mengklaim egress reduction tanpa evidence.** Wajib
  membedakan secara eksplisit: *observed metrics*, *derived estimates*,
  *assumptions*, dan *belum terverifikasi*.
- Setiap implementation plan yang menyentuh database wajib menyertakan:
  query-scope analysis, cache strategy, invalidation strategy,
  caller-frequency analysis, rollback path, verification plan.

### 7. Verifikasi setelah perubahan

Wajib menjalankan `npm run typecheck`, `npm run lint`, test terdampak, dan
`npm run build`. Bila tersedia, verifikasi production dengan
`pg_stat_statements`, database logs, runtime logs, Redis metrics,
Vercel/Cloudflare observability, dan Supabase usage/egress.

Bandingkan before/after: calls, rows/call, total rows, payload, cache
hit/miss, dan connection churn.

Untuk pengukuran ulang yang apples-to-apples, reset window dulu
(`select pg_stat_statements_reset();`), catat baseline `sum(calls)` dan
`sum(rows)` beserta `now()`, tunggu ≥48 jam, lalu hitung rows/day dengan
`sum(rows) / jam sejak reset × bytes-per-row`. Angka selalu boleh
diberi label *derived*, tidak pernah *observed*, kecuali dibaca langsung
dari sumber usage.

### 8. Penegakan: apa yang sudah jadi pagar, bukan sekadar dokumen

Aturan di bagian ini punya tiga lapis automate. Agent yang melanggar aturan
dengar-butuh tidak akan lolos merge.

| Lapis | Mechanisme | Menangkap apa |
|---|---|---|
| Lint error | `db-access/no-unbounded-select` di `eslint.config.mjs`, aturan dari `scripts/eslint/db-access.mjs` | `select().from()` tanpa proyeksi kolom dan tanpa `.limit()` di chain — **error**, bukan warning |
| Budget ratchet | `npm run perf:db-access` (`scripts/perf/db-access-budget.mjs`) | read yang **sudah** diproyeksi tapi tetap tanpa batas; jumlah per berkas hanya boleh turun |
| PR gate | `.github/PULL_REQUEST_TEMPLATE.md` §"Database-access gate" | IDENTIFY/BOUND/CACHE/FREQUENCY/VERIFY/BLOCK + worst-case calls/day dan rows/day, yang tidak bisa dicek mesin |

Aturan `.limit()` adalah satu-satunya penanda `bounded` yang dikenali.
`where`, `orderBy`, `for('update')`, dan `.get()` **tidak** membatasi: semua
tetap mengembalikan seluruh himpunan yang cocok. Itu sebabnya `snapshot()` dan
`load()` tetap terbaca sebagai read penuh meski sudah memfilter
`organizationId`.

Budget ratchet di `scripts/perf/db-access-budget.mjs` mengikat 8 berkas pada
nilai terukur hari ini. Nilai itu **pagar, bukan persetujuan**: Turunkan
saat pemiliknya diperbaiki, dan menaikkan angka selalu regresi. Kalau sebuah
read perlu melewati budget, jawabannya pagination atau filter — bukan
mengedit angka.

### 9. Pelaku known di tree ini (konteks — bukan-fix)

Pola berikut sudah terukur mengirim baris keluar tanpa batas. Jangan
melanjutkannya, jangan menambah pemanggil, dan jangan beralasan "kecil
sekarang":

| Pelaku | Lokasi | Mengapa berbahaya |
|---|---|---|
| `snapshot()` membaca seluruh `audit_logs` | `src/data/repos/publishing/repository.ts:817` | 13179 baris × ±1224 B per panggilan, dari satu GET dashboard |
| `snapshot()` membaca seluruh `invalidation_tasks` | `src/data/repos/publishing/repository.ts:813` | payload ~3096 B/baris, dan pemanggil tidak memakainya |
| `load()` memuat 17 tabel penuh | `src/data/repos/dashboard.ts:243` | whole-tenant hydration untuk diff in-memory |
| `load()` memuat `site_settings` penuh | `src/data/repos/dashboard.ts:250` | JSONB `colors`/`seo`/`navigation` per 4422 situs |
| `readComplete()` reload config penuh | `src/data/repos/runtime-config/reader.ts:21` | cold start tiap instance = full read |
| `readCategories()` per load halaman | `src/data/repos/delivery.ts:305` | ~60 baris × frekuensi tinggi, belum shared-cached per org |
| `isCacheBypassed()` di luar branch yang butuh | `src/data/repos/delivery.ts:314` | round trip yang berulang |
| TTL config 300 s memaksa refresh sering | `src/core/config/runtime/runtime-constants.ts:1` | shared TTL harus jadi penahan, bukan jam |
| `idle_timeout` 600 s masih menyisakan churn | `src/data/client.ts:42` | katalog `pg_type` ditarik ulang per koneksi |

Status enforcement per pelaku: `snapshot()` sudah dibatasi dan diproyeksi
(ceilings `SNAPSHOT_MAX_*`), `listMedia()` dan content admin sudah dibatasi.
`load()` **sengaja** dibiarkan tanpa ceiling karena `execute()` melakukan
diff dari state tersebut — menambahkan `LIMIT` akan memotong diff dan
menghapus record yang masih hidup. Perbaikannya adalah memindahkan diff ke
SQL, bukan menambah angka. Reads lain di daftar tetap terbuka dan tercatat
di budget ratchet.

Perbaikan untuk semua ini adalah pekerjaan terpisah; tugas ini hanya
menetapkan policy plus pagar automate.

## Owner overrides (rules stay flexible)

No rule in this file overrules an explicit owner instruction — these
rules constrain the agent's defaults and initiative, never the owner's
taste. When the owner changes requirements:

0. **The owner's stated request is the approval.** Do not ask for a second
   approval, do not re-justify the current design before starting, and do not
   answer "by design, so it cannot change" from the shape of a convention
   alone. `docs/architecture.md` §2 gives the deviation path for every
   architectural invariant: build the change, record one line of reason in the
   same commit as a `Deviates:` trailer, and update the doc that described the
   old default. Nothing in CI gates that trailer, deliberately: a
   machine-enforced approval step is what produces refusals instead of changes.
   This covers architecture and data rules, not only comment and commit style.
1. Adjust first, docs may follow: code the change, then update the
   governing docs (`docs/architecture.md`, `docs/migrations.md`, this file)
   in the same PR when practical. Docs are advisory, not a pre-code gate.
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
2. The `Drill Expire` organization is retired as a decision. The tenant stays
   parked in the database because `audit_logs.organization_id` is
   `ON DELETE RESTRICT` and it owns audit rows, so it can neither be deleted
   nor administered. Do not treat it as a fixture to reactivate; a future drill
   provisions a fresh tenant through the onboarding path instead.
3. The migration gate (`migration_gate_events.required_version`) may be
   armed or adjusted whenever the release needs it — no promotion-checklist
   restriction. See docs/migrations.md (advisory).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
