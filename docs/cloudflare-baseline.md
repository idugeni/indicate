# Cloudflare baseline operasional

> **Status:** Living document.
> **Owner:** Platform team.
> **Last verified:** 2026-09-17 via API (104 zona Indicate + `safenca.id`).
> **Related:** [domains](domains.md) · [active domains](active-domains.md) · [production readiness runbook](production-readiness-runbook.md)

Acuan kanonis per zona + checklist zona baru + ritme tinjauan.

## Baseline zona Indicate (106 zona: 104 + utama sudah termasuk)

| Area | Nilai kanonis | Keterangan |
|---|---|---|
| Status zona | `active` | Via `GET /zones` |
| SSL | `strict` + `ssl_automatic_mode=auto` | Full strict ke origin Vercel |
| TLS | `min_tls_version=1.2`, `tls_1_3=zrt`, `always_use_https=on`, `automatic_https_rewrites=on` | — |
| Bot | `enable_js=true`, `fight_mode=true`, `ai_bots_protection=block`, `crawler_protection=enabled` | — |
| Page Shield | `enabled=true` | — |
| WAF kustom | `tenant probes` (managed_challenge WP/env/git) | Maks 5 rule di Free; terpakai 1 |
| Rate limit | `tenant api guard` (20/10 dtk per IP, blokir 429) | Maks 1 rule di Free; sudah penuh |
| Edge cache | `Indicate edge cache` (bypass privat/auth, halaman 60 dtk, feed 600 dtk, brand bytes 1 thn) | Tidak dipasang di `safenca.id` (path app berbeda) |
| Browser cache TTL | `0` (hormati origin) | — |
| DNS inti | Apex + wildcard CNAME proxied ke target Vercel; CAA issue/issuewild × pki.goog/letsencrypt.org | — |
| Email non-kirim | SPF `v=spf1 -all`, DMARC reject + rua, DKIM-null `*._domainkey` | 94 bank; pengecualian di bawah |
| Email kirim+terima | Email Routing + Resend sending domain + DMARC Management | `indicate.web.id`, `safenca.id` |
| DNSSEC | `pending` → `active` setelah DS di registrar | Di luar API; lihat tabel DS di bawah |

## Pengecualian tercatat

- `indicate.web.id`: + record `www`, `pv` (Worker pageview), Email Routing + Resend aktif. Redirect Rule `www_to_apex_301` (fase `http_request_dynamic_redirect`, ruleset `www to apex redirect`): `www.indicate.web.id` → `https://indicate.web.id` + path, 301, preserve query — pengganti redirect domain Vercel `www` yang dilepas 2026-09-20 untuk slot kuota project.
- 9 tenant: DMARC + SPF + DKIM-null; tanpa Email Routing/Resend.
- `safenca.id`: tanpa `Indicate edge cache`, tanpa wildcard; Email Routing + Resend aktif.
- 94 bank: tanpa TXT kirim/terima selain hardening; tanpa record `www`/`pv`.

## Checklist zona baru (wajib sebelum dianggap selesai)

1. Zona `active`, nameserver Cloudflare terdelegasi.
2. `ssl=strict`, `ssl_automatic_mode=auto`, `always_use_https=on`, TLS 1.2+.
3. Bot Fight Mode + AI block + crawler enabled; Page Shield on.
4. Ruleset `tenant probes` + `tenant api guard` (cek sisa kuota Free).
5. Ruleset `Indicate edge cache` (kecuali app non-Indicate).
6. `browser_cache_ttl=0`; apex + wildcard proxied; CAA 4 record.
7. Email: hardening non-kirim default; aktifkan Routing/Resend hanya bila ditunjuk.
8. DNSSEC: enable di Cloudflare, catat DS untuk input registrar.
9. Baca-balik setiap item via API sebelum serah terima.

## Ritme tinjauan

- Mingguan: laporan agregat DMARC (dashboard Cloudflare), audit log lintas tenant.
- Per perilisan: `GET /api/health`, asosiasi exact-domain Vercel tiap hostname aktif.
- Per batch tenant: jalankan checklist di atas + saga aktivasi (`DomainProvisioningService`).

## Status DS registrar (tunggakan)

- `indicate.web.id` (IDWebHost): panel tanpa menu DS mandiri — via live chat/CS.
- 9 tenant (Exabytes): butuh pengecekan panel.
- 94 bank + `safenca.id`: `pending`, diurus bertahap per batch.
