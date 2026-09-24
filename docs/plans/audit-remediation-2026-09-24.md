# Rencana implementasi total hasil audit 2026-09-24

> Status: approved-plan (eksekusi per fase setelah konfirmasi owner).
> Sumber temuan: audit 6 sub-agent 2026-09-24 (multi-tenant, database, keamanan, UI/perf, infra, SEO).
> Kondisi terkunci: Vercel Pro riil (bukan trial), Cloudflare tetap di depan (proxy + WAF + cache),
> Supabase Postgres otoritatif, Upstash Redis akselerasi.
> Keputusan arsitektur: wildcard **per-apex** via delegasi `_acme-challenge` (tanpa pindah NS);
> tanpa wildcard global; exact-host DB dipertahankan sebagai allowlist.
> Prioritas: nol beban Vercel berlebih (domain gratis dalam batas plan; yang ditagih hanya traffic).

Aturan setiap task: satu commit logis (`<tipe>[scope]: <deskripsi>`, Inggris, kecil, imperatif,
maks 72 karakter, tanpa titik, tanpa emoji), selalu `git commit -s`,
`npm run typecheck` + `npm run lint` + test terdampak hijau sebelum commit. Tanpa secret di diff.

## Fase 0 — Fondasi dan verifikasi pasca-upgrade (blokir semua)

- [ ] 0.1. Verifikasi Pro riil aktif via `get_git_deployment_context` (plan `pro`, bukan trial)
  dashboard Billing. Cek 50 domain existing utuh (`list_project_domains`, semua `verified:true`).
  Lolos bila plan=pro dan 50/50 utuh.
- [ ] 0.2. Uji tambah 1 domain stok untuk buktikan cap 50 hilang. Bila masih mentok,
  contact support (rujuk `docs/vercel-multi-tenant/limits.md`: Pro soft 100rb) sebelum Fase 2.
  Bila lolos, hapus domain uji.
- [ ] 0.3. Rapikan working tree kotor (temuan DB #8): review isi
  `20260925000000_media_gallery_editorial.sql` (untracked), commit
  `bootstrap/indicate-schema.sql` + `_journal.json` + repos termodifikasi, apply idx 168 ke live,
  verifikasi `max version` = 168.
- [ ] 0.4. Identifikasi 2 policy `TO public`:
  `SELECT tablename, policyname FROM pg_policies WHERE roles::text LIKE '%public%'`.
  Dokumentasikan bila disengaja (`public_directory`) atau cabut. Target: nol policy publik misterius.

## Fase 1 — Skala baca: Redis read-model + query dashboard (Critical)

- [ ] 1.1. Redis read-model hostname ke konteks site (pola `mirrorState` ada).
  Writer: aktivasi/deaktivasi Site tulis/hapus key `host:{normalizedHostname}` (TTL 60–86400 dtk,
  pola `runtime-context.ts:166-173`). `HostnameResolver.classify`
  (`src/modules/delivery/hostname-resolver.ts:20-28`) baca Redis dulu, fallback Postgres + isi balik.
  Verifikasi: cold lookup tanpa DB hit, 404 unknown tetap cepat, invalidasi key saat
  `site.update`/deaktivasi (test: ubah status menjadi non-aktif, key terhapus).
- [ ] 1.2. Perbaiki `dashboard.ts:88-99`: ganti `SELECT *` 17 tabel dengan seleksi kolom
  yang dipakai + pagination untuk tabel besar (`articles`, `articleSites`, `media`,
  `publishingJobs/Targets`). Verifikasi: EXPLAIN + rows ditransfer sebelum/sesudah.
- [ ] 1.3. Hilangkan N+1 (`dashboard.ts:100-106`): satu `SELECT … WHERE user_id = ANY($1)`.
  Verifikasi: 61 memberships = 1 query, bukan 61.
- [ ] 1.4. `analyticsSummary` (`dashboard.ts:157-313`): bungkus `REPEATABLE READ` + retry
  seperti `reader.ts:33-59`. Verifikasi: snapshot konsisten di bawah write load (test konkurensi).
- [ ] 1.5. `enqueueCachePurge` (`dashboard.ts:634-637`): multi-row `values([...])` tunggal.
  Verifikasi: N sites = 1 statement.

## Fase 2 — Operasi domain: backoff + wildcard per apex (52 operasi sekali)

- [ ] 2.1. Backoff 429 di `exact-domain-adapter.ts:8`: baca status 429 + `Retry-After`,
  exponential backoff + jitter, bedakan 429 (retry) vs 4xx permanen (gagal cepat).
  Verifikasi: mock 429 beruntun menjadi sukses tanpa bakar kuota buta.
- [ ] 2.2. Delegasi `_acme-challenge` per 26 apex ke Vercel (CNAME di Cloudflare,
  sesuai `configuring-domains.md` external-DNS). Proxy + DNS wildcard `*` Cloudflare tetap,
  tidak pindah NS. Verifikasi per apex: `dig TXT _acme-challenge.<apex>` + status cert Vercel.
- [ ] 2.3. Tambahkan 26 `*.apex` ke project Vercel (total final 52 slot: 26 apex + 26 wildcard),
  ber-batch kecil (maks 20/jam; hormati add 100/verify 50 per jam) dengan backoff 2.1.
  Regional `wonosobo.*` existing tetap (sudah exact, jangan dihapus).
  Verifikasi: `list_project_domains` = 52 semua `verified:true` +
  `https://wonosobo.<apex>` 200 + `https://acak-<token>.<apex>` 404.
- [ ] 2.4. Onboarding kota baru menjadi DB-only: lewati asosiasi exact untuk subdomain
  satu-label di apex ber-wildcard (`domain-provisioning-service.ts`), tetap probe + audit.
  Update skill `tenant-onboarding`. Verifikasi: 1 regional fiktif menjadi live dengan 0 API call Vercel.

## Fase 3 — Keamanan (semua temuan)

- [ ] 3.1. SSRF `pending-hostname-probe.ts:29-36`: parse segmen dotted dalam `::ffff:`,
  tolak bila oktet privat; pin IP hasil `lookup` ke socket (hilangkan TOCTOU `:45-53`).
  Verifikasi: PoC `::ffff:127.0.0.1`, `::ffff:10.0.0.1` ditolak; domain publik lolos.
- [ ] 3.2. CGNAT satu baris (`:12-28`): `if (a === 100 && b >= 64 && b <= 127) return false`.
  Verifikasi: unit test `100.64.0.1`/`100.127.255.255` ditolak, `100.128.0.1` lolos.
- [ ] 3.3. Strip inbound `x-tenant-*` di `proxy.ts` semua path
  (contoh `middleware-and-routing.md`). Verifikasi: kirim `x-tenant-id` palsu,
  response tetap sesuai `host`.
- [ ] 3.4. `platform-guard.ts:69-81`: tolak bila `cf-connecting-ip` absen;
  `:51-67` dukung CIDR IPv6 atau tolak entri non-IPv4 dengan error eksplisit.
  Verifikasi: request langsung tanpa header CF menjadi 404 + audit log.
- [ ] 3.5. `LIKE` + `ESCAPE '\'` (`publishing/repository.ts:259,288`).
  Verifikasi: UUID lolos, pola `%`/`_` literal tidak melebar.
- [ ] 3.6. Evaluasi penyempitan CSP `img-src`/`connect-src` (`proxy.ts:31-33`).
  Hati-hati embed sosial; bila ragu catat tertunda, jangan longgarkan.
- [ ] 3.7. Verifikasi writer cookie Supabase (`Secure`/`HttpOnly`/`Domain`);
  `__Host-` dicatat tidak aplicable (nama cookie milik Supabase). Tutup dengan bukti.

## Fase 4 — Infra Cloudflare + data

- [ ] 4.1. Deploy ulang skip-rule crawler sosial sebagai rule WAF #1 di **semua** zona tenant
  (live hanya ada challenge rule). Verifikasi: sampling zona +
  `curl -A facebookexternalhit` 200, probe `wp-login.php` kena challenge.
- [ ] 4.2. Update `cloudflare-baseline.md:17,39` (`ai_bots_protection: disabled` + alasan pilot 403)
  catatan "130 zona live = Indicate + proyek lain" di `docs/domains.md:8-9`. Verifikasi: `lint:md`.
- [ ] 4.3. Retensi: hapus kategori yatim `telegram_conversations`; definisikan retensi `audit_logs`
  (1067 rows, insert-only); catat di `docs/migrations.md` atau runbook.
  Verifikasi: `retention_runs` bersih + 1 run audit sukses.
- [ ] 4.4. 37 unused index: monitor saja; telusuri `runtime_config_revisions_environment_idx`
  (kemungkinan query terbungkus fungsi). Jangan drop buta.

## Fase 5 — SEO + machine surfaces

- [ ] 5.1. Sitemap/news-sitemap pakai URL kanonis
  (`seo.ts:397-434` + `resolveArticleCanonical :147-151` + cascade `:82`).
  Verifikasi: artikel cascade fiktif, sitemap regional berisi URL apex, cocok canonical HTML.
- [ ] 5.2. Filter `noindex` dari kedua sitemap (`seo.ts:372-434` cek `robotsDirective`).
  Verifikasi: artikel `noindex` tidak muncul di sitemap.
- [ ] 5.3. Guard unik/tanpa-`:`/anti-template untuk `seoDefaultDescription`
  (Zod refine + cek onboarding; unique index opsional setelah verifikasi nol duplikat 20 site).
  Verifikasi: input `"Portal berita X — ..."` dan `":"` ditolak.
- [ ] 5.4. `lastmod` homepage kosong pakai `createdAt` site, bukan `now` (`seo.ts:373-377`).
  Verifikasi: 2 fetch berurutan `lastmod` stabil.

## Fase 6 — UI/perf + penutup UNVERIFIED

- [ ] 6.1. Ukur bundle dispatcher (`network-listing.tsx:4-103`) sebelum refactor (trace build).
  Bila signifikan, `next/dynamic` per-template; bila kecil, catat keputusan.
- [ ] 6.2. `unoptimized` tanpa syarat + 1 baris komentar maksud di kartu hero/article;
  petakan hex marketing ke token `globals.css` (atau catat tema terang disengaja di `design.md`).
- [ ] 6.3. Tutup UNVERIFIED dengan bukti: render browser (LCP/CLS 1 template via chrome-devtools),
  metrik prod (invokasi + bandwidth pasca-wildcard), sampling 130 zona penuh,
  render artikel/kategori + Search Console, `db-bootstrap --check`, R2 orphan/HEAD,
  kirim email uji Resend di staging.

## Kriteria selesai total

Kuota terbukti hilang, 52 domain verified, wildcard route + 404 liar benar, Redis read-model live,
dashboard tanpa full-scan/N+1, semua Medium security hijau, WAF 2-rule di semua zona,
sitemap kanonis, tree bersih, `typecheck` + `lint` + `lint:md` + test hijau.
Tanpa wildcard global; tanpa migrasi NS.
