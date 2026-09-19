# Pelajaran operasional (ditulis 2026-09-19 dari insiden nyata)

## 1. Tulis ke Supabase via MCP: selalu transaksi eksplisit + konteks tenant

RLS dipaksa (`FORCE`) di tabel tenant dan koneksi berjalan lewat pooler
(Supavisor) dengan GUC sisa sesi lain. Akibatnya baca/tulis tanpa konteks
tidak deterministik: baris yang ada bisa terbaca hilang, FK gagal padahal
baris ada.

Pola wajib untuk setiap panggilan tulis (dan baca verifikasi):

```sql
BEGIN;
SET LOCAL app.organization_id='<org-uuid>';
SET LOCAL app.region_id=''; -- NULL untuk apex; isi region untuk regional
SET LOCAL app.actor_id='ops:<nama-batch>';
SET LOCAL app.request_id='<id-unik>';
-- ... kerja ...
COMMIT;
```

`set_tenant_context()` menolak bila sesi membawa org lain (konflik
konteks), jadi `SET LOCAL` langsung lebih aman untuk batch operator.
Satu panggilan `execute_sql` = satu sesi; jangan andalkan status appels
sebelumnya.

## 2. UUID disalin, tidak diketik ulang — lalu uji round-trip

Insiden 2026-09-19: satu karakter salah salin (`8ee4` vs `8eb5`)
menyebabkan puluhan panggilan gagal dan diagnosis liar (korupsi indeks,
pooler, transaksi bocor). Semua runtuh setelah literal dibetulkan.

Aturan: ambil UUID dari output query lewat salin, dan sebelum batch tulis
besar, uji satu `id_match` di SQL (`(id = '<uuid>'::uuid)`) — bukan
dengan mata.

## 3. Urutan diagnosis "baris ada tapi FK gagal"

1. Benarkan literal dulu (uji `id_match`/`org_match` di SQL).
2. Pastikan konteks tenant + transaksi eksplisit (aturan 1).
3. Baru curigai korupsi indeks (`amcheck`) atau transaksi bocor
   (`pg_stat_activity`).

## 4. Checklist brand per site (protokol baku, terbukti 35 site)

Master gradient huruf awal nama portal (tabrakan huruf = bytes sama,
upload terpisah per site). Per site: PUT logo + favicon ke R2
(`sites/{siteId}/{logo|favicon}-{domain-rapi}-{16hex}.png`,
`Content-Type image/png`, checksum SHA256) → verifikasi HEAD (200 +
ukuran + tipe) → dalam satu transaksi DB: reservasi ×2 → media ×2
aktif → reservasi → `used` → settings (+versi, taut media) → task
`media.activated` → audit (2 reserve + 2 activate + 1 settings-update,
aktor `system`, `request_id ops:<batch>`). Bersihkan objek yatim
(data tanpa baris media).

## 5. Fakta kapasitas (terverifikasi API, bukan asumsi)

Limit domain Vercel adalah **50 per project** (`project_domain_limit_reached`),
bukan 250. Setiap hostname (apex maupun regional) makan 1 slot dan butuh
asosiasi exact — wildcard Cloudflare tidak menggantikan slot Vercel.
Target CNAME project stabil (`58a0c0dd872d3769.vercel-dns-017.com`,
proxied) dipakai ulang untuk semua zona.

## 6. Ledger md adalah definition-of-done

Setiap perubahan domain/hostname wajib dicatat di
`docs/active-domains.md` (status DB + Vercel + HTTP + kuota) pada giliran
yang sama — bukan belakangan.
