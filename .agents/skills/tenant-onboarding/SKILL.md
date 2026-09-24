---
name: tenant-onboarding
description: Playbook for adding tenants (domains, regional sites, brand, SEO) to Indicate at any scale — 1 or 1,000. Use whenever asked to add, provision, brand, or SEO-fill tenant domains, sites, or regions — even when the request does not name it. Encodes the apex-first pattern, wildcard-per-apex transport, DB-only regional onboarding, null-inheritance contract, per-site media scoping, unique-metadata rule, and the verify-everything protocol proven on 36 live apexes.
---

# Tenant Onboarding (pola baku — 2026-09-25)

Satu domain = satu Site apex + `site_settings`. Region = Site regional (`region_id` terisi) di bawah domain yang sama. Semua operasi tenant ter-scope tepat satu `organizationId`. Transport hostname wildcard-per-apex: regional satu-label tidak butuh asosiasi Vercel.

## Prinsip yang tidak boleh dilanggar

1. **Apex dulu, region mewarisi.** Brand (`logo_media_id`, `favicon_media_id`) hanya diisi di Site apex. Site regional dibiarkan `NULL` — warisan ke induk sudah didukung render (`src/data/repos/delivery.ts`) DAN otorisasi publik (`authorizePublicMedia` di `src/data/repos/publishing/repository.ts`). Jangan menaut eksplisit media induk ke regional: itu basi saat induk berganti (fan-out update) dan merusak single-source-of-truth.
2. **NULL warisan adalah desain, bukan utang.** `NULL` = "tidak ada override, warisi". Jangan membuat tabel warisan eksplisit, jangan copy-down nilai induk ke regional. Satu-satunya NULL yang berarti "data belum ada" adalah yang belum pernah diisi di apex (dulu: 18/18 logo).
3. **Media ter-scope pemilik.** PK `media` = `(organization_id, id)`; tepat-satu-pemilik (`article_id` XOR `site_id` XOR `organization_asset`) + prefix key (legacy `sites/{siteId}/%`, `articles/{id}/%`, `assets/%` atau tenant-scoped `o/{org}/p/{purpose}/...`). Upload selalu dalam konteks org pemilik; satu file yang sama untuk dua site = dua upload terpisah. Purpose sampul (`article-cover`) memakai prefix `pub/` → bucket publik `indicate-media-public` (baca langsung via `media.indicate.website`); gambar isi (`article-inline`) dan sisanya tetap bucket privat.
4. **SEO unik per hostname.** `seo_default_description` adalah meta description semua halaman listing + deskripsi kanal RSS (`src/modules/site/seo.ts`). Dilarang template slot-fill ("Portal berita {X} — ..."). Aturan copy: apex bernada nasional tanpa sebut region; regional menyebut region sesuai nama subdomain; tanpa karakter `:`; struktur kalimat berbeda per site. `name`, `description`, `seo_default_title`, `og:site_name` juga wajib unik. Skema dashboard menolak pola template dan titik dua (Zod refine) — tetap tulis copy final yang baik sejak awal, jangan mengandalkan validasi.
5. **Master tidak tersentuh.** `docs/templates/brand/gradient/*.png` hanya dibaca byte-nya. Tidak dihapus, tidak diganti nama.
6. **Transport wildcard-per-apex, bukan exact-per-hostname.** Setiap apex punya `*.apex` terasosiasi di Vercel + sertifikat terbit. Regional satu-label tidak butuh apa pun di Vercel (DB-only). Jangan membuat asosiasi exact untuk regional — itu pola lama yang membakar slot dan API call.
7. **Invalidasi read-model hostname.** Resolusi hostname di-cache di Redis (`host:{hostname}`, hit 1 jam, miss 1 menit). Saga aktivasi/deaktivasi menulis/menghapus key otomatis. Bila insert site manual via SQL (bukan saga), hapus key `host:{hostname}` manual atau tunggu TTL — kalau tidak, hostname baru tetap 404 sampai cache kedaluwarsa.

## Brand: pemetaan huruf awal

- Gradien per huruf ada lengkap a–z di `docs/templates/brand/gradient/letter-{a-z}-grad.png`.
- Domain dipetakan ke huruf awal namanya (fakta01→F, dst). Tabrakan (wartakini7 + wawasannusa = W) diputuskan pemilik: boleh berbagi file yang sama, TAPI tetap dua upload terpisah (beda `siteId`, constraint prefix).
- Key R2: tenant-scoped `o/{org}/p/site-{logo|favicon}/.../{siteId}/...` (sanitasi: lowercase, non-alnum → `-`; token acak aman minimal 12 karakter). Bucket privat (nama dari konfigurasi deployment); tidak ada folder per domain. Sampul (`article-cover`) memakai prefix `pub/` di bucket publik — logo/favicon TIDAK PERNAH publik.
- Format checksum ganda: reservasi `expected_checksum` = base64 (constraint `^[A-Za-z0-9+/]{43}=$`), `media.checksum` = hex (konvensi baris existing). Verifikasi HEAD wajib cocok sebelum tulis DB.
- PNG diterima penuh (`image/png` di `media_policy`); `.ico` opsional, tidak wajib. `tenantFavicon` tidak cek ekstensi.

## Urutan eksekusi per domain baru (idempoten, per-site transaction)

0. Prasyarat infra (sekali per apex, lewati bila sudah ada): exact apex terasosiasi
   Vercel `verified`, wildcard `*.apex` terasosiasi + sertifikat terbit
   (`vercel certs issue --challenge-only "*.apex"` → TXT `_acme-challenge` di
   Cloudflare → `vercel certs issue "*.apex"`; uji `https://acak-<token>.<apex>`
   → halaman 404 bermerek), WAF 2-rule. Tanpa ini jangan lanjut ke brand.
1. Resolve `siteId` apex + `version` settings. Jika `logo/favicon_media_id` sudah menunjuk media `active` → SKIP.
2. Bersihkan yatim: list prefix `sites/{siteId}/{favicon|logo}-`, hapus objek yang tidak direferensi `media`.
3. Baca master → sha256 hex + base64 → PUT R2 (`ContentType: image/png`, `ChecksumSHA256: base64`) → HEAD assert (checksum, length, type).
4. Dalam SATU transaksi DB: insert `media_key_reservations` (`reserved`, `expires_at` +24 jam) → insert `media` (`active`, purpose `site-favicon`/`site-logo`) → reservasi → `used` → update `site_settings` (+1 `version`, optimistic lock `AND version=`) → insert `invalidation_tasks` (`media.activated`, urls = base paths + media route twins per hostname) → 3 audit (`media.upload.reserve`, `media.activate`, `site.settings.update`, aktor `system`, `request_id` `ops:<nama-batch>`).
5. Region: TIDAK ADA langkah brand. Pastikan tetap `NULL`. Site regional cukup baris
   `sites` + `site_settings` (DB-only, 0 API call Vercel) — saga menemukan wildcard
   induk dan melewati asosiasi exact otomatis.
6. SEO: tulis `description` + `seo_default_description` unik (aturan copy di atas) dengan audit + invalidasi `site.settings.update` serupa.

## Baseline Cloudflare per zona tenant (pola baku — 2026-09-23, terverifikasi 36/36 zona)

Setiap domain apex = satu zona Cloudflare (paket Free) dengan konfigurasi IDENTIK di bawah. Regional satu-label (`wonosobo.*`) tercakup wildcard + Universal SSL, tanpa zona sendiri. Terapkan blok ini utuh saat menambah domain; divergensi antar-zona adalah bug.

1. **DNS:** CNAME apex + CNAME wildcard (`*`), keduanya proxied, target hostname Vercel (`*.vercel-dns-*.com`). CAA `issue` + `issuewild` (letsencrypt.org, pki.goog). TXT: SPF `v=spf1 -all`, DMARC `v=DMARC1; p=reject; sp=reject`, DKIM wildcard (`*._domainkey`).
2. **TLS:** SSL `strict`, min TLS `1.2`, Always HTTPS `on`, Universal SSL aktif. DNSSEC: `pending` di semua zona (keputusan registrar, bukan kode — jangan kejar dari sini).
3. **WAF custom (`http_request_firewall_custom`), urutan PENTING:** (1) `Allow social preview crawlers` — skip remaining custom rules untuk UA `facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot`; (2) `Challenge WP/env/git probes` — managed_challenge untuk path `wp-login.php|xmlrpc.php|/.env|/.git/`. Skip rule WAJIB pertama agar lolos AI Crawl Control.
4. **Cache (`http_request_cache_settings`):** bypass untuk private/auth/mutasi; edge-cache halaman publik 60 dtk (tanpa query); feeds override 600 dtk; brand bytes (`/icon.png`, `/apple-touch-icon.png`, `/logo.png`, `/manifest.webmanifest`, tanpa query) override 1 tahun immutable.
5. **Rate limit (`http_ratelimit`):** API/auth 20 per 10 dtk per IP → block.
6. **Bots:** `fight_mode` on, `ai_bots_protection` **disabled**, `crawler_protection` enabled. Keputusan sadar 2026-09-23: AI-block paket Free menendang crawler sosial campuran (kasus facebookexternalhit 403, terbukti via pilot) dan TIDAK bisa di-skip per-UA — proteksi konten mengandalkan hak cipta/ToS. Jangan nyalakan AI-block tanpa pengecualian yang terbukti jalan.
7. **Vercel:** asosiasi exact setiap hostname apex ke satu proyek; verifikasi `verified`, tanpa orphan. Tambah wildcard `*.apex` + terbitkan sertifikat (alur `certs issue` di atas; perpanjangan ~90 hari butuh challenge baru — jadwalkan pengingat). Regional satu-label (`wonosobo.*`) DB-only tanpa asosiasi exact setelah wildcard `*.apex` terasosiasi + cert terbit: saga aktivasi melewati langkah Vercel (`exactDomain: false`, `wildcardInherited: true` di `external_status`), tetap probe + audit (`DomainProvisioningService`, flag `dbOnlyRegionalOnboarding`). Jangan nyalakan flag sebelum cert apex terbit.

## Verifikasi wajib (fix tanpa verifikasi = belum selesai)

- DB: media `active`, settings tertaut, regional `NULL`, tasks `pending`, audit lengkap.
- R2: HEAD tiap key cocok ukuran; tidak ada yatim.
- HTTP (dev server + override header `Host`): `GET /api/network/media/{id}` → 307 untuk SEMUA hostname apex DAN regional; ikuti satu redirect hingga byte (`image/png`, panjang cocok). `GET /icon.png`, `/apple-touch-icon.png`, `/logo.png` → 200 bytes immutable stabil (bukan redirect); `GET /manifest.webmanifest` → manifest tenant. Cek `<meta name="description">` + `og:description` di HTML untuk SEO.
- Wildcard: `GET /` apex → 200 portal; `GET /` regional → 200 portal regional; `GET /` subdomain acak → halaman 404 bermerek + `noindex` (tanpa bocor konten tenant). Sitemap berisi URL kanonis, artikel `noindex` tidak muncul.
- Redis: `GET host:{hostname}` mengembalikan konteks site setelah request pertama; setelah deaktivasi, key terhapus.

## Catatan skala (ribuan domain × N region)

- Biaya favicon/logo: 1 upload per domain, 0 per region. Ganti file induk = cascade otomatis ke semua region.
- Biaya Vercel: domain + sertifikat wildcard gratis di Pro; satu-satunya meterai adalah traffic. Gambar `unoptimized` tanpa syarat (nol biaya transformasi).
- Staleness terbatas: task invalidasi per site apex; halaman regional ter-cache edge bisa tertinggal hingga TTL/dispatcher (puluhan detik–menit). Read-model Redis: hit 1 jam, miss 1 menit.
- Batas: tidak ada enforcement kuota domain/site di DB (`subscriptions` status-only, tanpa tabel kuota); hostname apex butuh asosiasi exact + wildcard + cert Vercel via saga/CLI, regional satu-label DB-only (DNS regional satu-label sudah tercakup wildcard Cloudflare + Universal SSL). Soft-cap Pro 100 ribu domain — slot 86 saat ini negligible.
- Sertifikat wildcard ~90 hari: tanpa delegasi NS + Enable Vercel DNS, perpanjangan butuh challenge TXT baru per apex. Jadwalkan pengingat atau kejar delegasi permanen.
- Larangan umum tetap berlaku: jangan cetak secret, jangan tebak endpoint (cek OpenAPI/MCP), skrip sekali-pakai di luar repo (temp dir), repo hanya diubah bila kode yang diperbaiki.
