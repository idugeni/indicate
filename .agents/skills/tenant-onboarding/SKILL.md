---
name: tenant-onboarding
description: Playbook for adding tenants (domains, regional sites, brand, SEO) to Indicate at any scale — 1 or 1,000. Use whenever asked to add, provision, brand, or SEO-fill tenant domains, sites, or regions — even when the request does not name it. Encodes the apex-first pattern, null-inheritance contract, per-site media scoping, unique-metadata rule, and the verify-everything protocol proven on the first 9 domains.
---

# Tenant Onboarding (pola baku — 2026-09-15)

Satu domain = satu Site apex + `site_settings`. Region = Site regional (`region_id` terisi) di bawah domain yang sama. Semua operasi tenant ter-scope tepat satu `organizationId`.

## Prinsip yang tidak boleh dilanggar

1. **Apex dulu, region mewarisi.** Brand (`logo_media_id`, `favicon_media_id`) hanya diisi di Site apex. Site regional dibiarkan `NULL` — warisan ke induk sudah didukung render (`src/data/repos/delivery.ts`) DAN otorisasi publik (`authorizePublicMedia` di `src/data/repos/publishing/repository.ts`). Jangan menaut eksplisit media induk ke regional: itu basi saat induk berganti (fan-out update) dan merusak single-source-of-truth.
2. **NULL warisan adalah desain, bukan utang.** `NULL` = "tidak ada override, warisi". Jangan membuat tabel warisan eksplisit, jangan copy-down nilai induk ke regional. Satu-satunya NULL yang berarti "data belum ada" adalah yang belum pernah diisi di apex (dulu: 18/18 logo).
3. **Media ter-scope pemilik.** PK `media` = `(organization_id, id)`; tepat-satu-pemilik (`article_id` XOR `site_id` XOR `organization_asset`) + prefix key (`sites/{siteId}/%`, `articles/{id}/%`, `assets/%`). Upload selalu dalam konteks org pemilik; satu file yang sama untuk dua site = dua upload terpisah.
4. **SEO unik per hostname.** `seo_default_description` adalah meta description semua halaman listing + deskripsi kanal RSS (`src/modules/site/seo.ts`). Dilarang template slot-fill ("Portal berita {X} — ..."). Aturan copy: apex bernada nasional tanpa sebut region; regional menyebut region sesuai nama subdomain; tanpa karakter `:`; struktur kalimat berbeda per site. `name`, `description`, `seo_default_title`, `og:site_name` juga wajib unik.
5. **Master tidak tersentuh.** `docs/templates/brand/gradient/*.png` hanya dibaca byte-nya. Tidak dihapus, tidak diganti nama.

## Brand: pemetaan huruf awal

- Gradien per huruf ada lengkap a–z di `docs/templates/brand/gradient/letter-{a-z}-grad.png`.
- Domain dipetakan ke huruf awal namanya (fakta01→F, dst). Tabrakan (wartakini7 + wawasannusa = W) diputuskan pemilik: boleh berbagi file yang sama, TAPI tetap dua upload terpisah (beda `siteId`, constraint prefix).
- Key R2: `sites/{siteId}/{favicon|logo}-{domain-rapi}-{token-aman}.png` (sanitasi: lowercase, non-alnum → `-`; token acak aman minimal 12 karakter). Satu bucket privat (nama dari konfigurasi deployment); tidak ada folder per domain.
- Format checksum ganda: reservasi `expected_checksum` = base64 (constraint `^[A-Za-z0-9+/]{43}=$`), `media.checksum` = hex (konvensi baris existing). Verifikasi HEAD wajib cocok sebelum tulis DB.
- PNG diterima penuh (`image/png` di `media_policy`); `.ico` opsional, tidak wajib. `tenantFavicon` tidak cek ekstensi.

## Urutan eksekusi per domain baru (idempoten, per-site transaction)

1. Resolve `siteId` apex + `version` settings. Jika `logo/favicon_media_id` sudah menunjuk media `active` → SKIP.
2. Bersihkan yatim: list prefix `sites/{siteId}/{favicon|logo}-`, hapus objek yang tidak direferensi `media`.
3. Baca master → sha256 hex + base64 → PUT R2 (`ContentType: image/png`, `ChecksumSHA256: base64`) → HEAD assert (checksum, length, type).
4. Dalam SATU transaksi DB: insert `media_key_reservations` (`reserved`, `expires_at` +24 jam) → insert `media` (`active`, purpose `site-favicon`/`site-logo`) → reservasi → `used` → update `site_settings` (+1 `version`, optimistic lock `AND version=`) → insert `invalidation_tasks` (`media.activated`, urls = base paths + media route twins per hostname) → 3 audit (`media.upload.reserve`, `media.activate`, `site.settings.update`, aktor `system`, `request_id` `ops:<nama-batch>`).
5. Region: TIDAK ADA langkah. Pastikan tetap `NULL`.
6. SEO: tulis `description` + `seo_default_description` unik (aturan copy di atas) dengan audit + invalidasi `site.settings.update` serupa.

## Baseline Cloudflare per zona tenant (pola baku — 2026-09-23, terverifikasi 36/36 zona)

Setiap domain apex = satu zona Cloudflare (paket Free) dengan konfigurasi IDENTIK di bawah. Regional satu-label (`wonosobo.*`) tercakup wildcard + Universal SSL, tanpa zona sendiri. Terapkan blok ini utuh saat menambah domain; divergensi antar-zona adalah bug.

1. **DNS:** CNAME apex + CNAME wildcard (`*`), keduanya proxied, target hostname Vercel (`*.vercel-dns-*.com`). CAA `issue` + `issuewild` (letsencrypt.org, pki.goog). TXT: SPF `v=spf1 -all`, DMARC `v=DMARC1; p=reject; sp=reject`, DKIM wildcard (`*._domainkey`).
2. **TLS:** SSL `strict`, min TLS `1.2`, Always HTTPS `on`, Universal SSL aktif. DNSSEC: `pending` di semua zona (keputusan registrar, bukan kode — jangan kejar dari sini).
3. **WAF custom (`http_request_firewall_custom`), urutan PENTING:** (1) `Allow social preview crawlers` — skip remaining custom rules untuk UA `facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot`; (2) `Challenge WP/env/git probes` — managed_challenge untuk path `wp-login.php|xmlrpc.php|/.env|/.git/`. Skip rule WAJIB pertama agar lolos AI Crawl Control.
4. **Cache (`http_request_cache_settings`):** bypass untuk private/auth/mutasi; edge-cache halaman publik 60 dtk (tanpa query); feeds + brand-mark override 600 dtk.
5. **Rate limit (`http_ratelimit`):** API/auth 20 per 10 dtk per IP → block.
6. **Bots:** `fight_mode` on, `ai_bots_protection` block, `crawler_protection` enabled. Jangan matikan untuk crawler sosial — pengecualiannya lewat skip rule (3), bukan dengan melonggarkan global.
7. **Vercel:** asosiasi exact setiap hostname (apex + regional) ke satu proyek; verifikasi `verified`, tanpa orphan.

## Verifikasi wajib (fix tanpa verifikasi = belum selesai)

- DB: media `active`, settings tertaut, regional `NULL`, tasks `pending`, audit lengkap.
- R2: HEAD tiap key cocok ukuran; tidak ada yatim.
- HTTP (dev server + override header `Host`): `GET /api/network/media/{id}` → 307 untuk SEMUA hostname apex DAN regional; ikuti satu redirect hingga byte (`image/png`, panjang cocok). Cek `<meta name="description">` + `og:description` di HTML untuk SEO.

## Catatan skala (ribuan domain × N region)

- Biaya favicon/logo: 1 upload per domain, 0 per region. Ganti file induk = cascade otomatis ke semua region.
- Staleness terbatas: task invalidasi per site apex; halaman regional ter-cache edge bisa tertinggal hingga TTL/dispatcher (puluhan detik–menit).
- Batas: tidak ada enforcement kuota domain/site di DB (`subscriptions` status-only, tanpa tabel kuota); tiap hostname butuh asosiasi exact Vercel via saga aktivasi (DNS regional satu-label sudah tercakup wildcard Cloudflare + Universal SSL).
- +1 query PK (settings induk) per request regional — negligible.
- Larangan umum tetap berlaku: jangan cetak secret, jangan tebak endpoint (cek OpenAPI/MCP), skrip sekali-pakai di luar repo (temp dir), repo hanya diubah bila kode yang diperbaiki.
