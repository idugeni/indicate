# Peta UPT Pemasyarakatan per Region — Jawa Tengah

Sumber: direktori resmi Kanwil Ditjenpas Jateng (`pemasyarakatanjateng.id/satker`,
total 59: 32 Lapas + 18 Rutan + 8 Bapas + 1 LPKA) disilangkan dengan
`organizations` live (`seed=upt-jateng-59org`, 59/59 nama cocok per 2026-09-17).

Ringkasan (model 31 portal, kab/kota senama gabung): **29 dari 31** portal
punya UPT — **11 portal multi-UPT**, **18 portal 1 UPT**,
**2 portal tanpa UPT**.

## Multi-UPT (11 portal, 41 UPT)

| Portal | Jumlah | UPT |
|---|---|---|
| `cilacap` | 14 | Lapas I Batu NK, IIA Besi NK, Khusus IIA Karanganyar NK, IIA Kembang Kuning NK, IIA Gladakan NK, IIA Kumbang NK, IIA Ngaseman NK, Narkotika IIA NK, IIA Pasir Putih NK, IIA Permisan NK, IIB Nirbaya NK, Terbuka IIB NK, IIB Cilacap, Bapas II Nusakambangan |
| `semarang` | 5 | Lapas I Semarang, Perempuan IIA Semarang, Rutan I Semarang, Bapas I Semarang, Lapas IIA Ambarawa |
| `banyumas` | 4 | Lapas IIA Purwokerto, Narkotika IIB Purwokerto, Rutan IIB Banyumas, Bapas II Purwokerto |
| `kendal` | 3 | Lapas IIA Kendal, Terbuka IIB Kendal, Pemuda IIB Plantungan |
| `pekalongan` | 3 | Lapas IIA Pekalongan, Rutan IIA Pekalongan, Bapas II Pekalongan |
| `magelang` | 2 | Lapas IIA Magelang, Bapas II Magelang |
| `tegal` | 2 | Lapas IIB Tegal, Lapas IIB Slawi |
| `klaten` | 2 | Lapas IIB Klaten, Bapas II Klaten |
| `pati` | 2 | Lapas IIB Pati, Bapas II Pati |
| `purworejo` | 2 | LPKA I Kutoarjo, Rutan IIB Purworejo |
| `surakarta` | 2 | Rutan I Surakarta, Bapas I Surakarta |

## Satu UPT (18 portal, 18 UPT)

| Portal | UPT |
|---|---|
| `banjarnegara` | Rutan IIB Banjarnegara |
| `batang` | Lapas IIB Batang |
| `blora` | Rutan IIB Blora |
| `boyolali` | Rutan IIB Boyolali |
| `brebes` | Lapas IIB Brebes |
| `demak` | Rutan IIB Demak |
| `grobogan` | Lapas IIB Purwodadi |
| `jepara` | Rutan IIB Jepara |
| `kebumen` | Rutan IIB Kebumen |
| `kudus` | Rutan IIB Kudus |
| `pemalang` | Rutan IIB Pemalang |
| `purbalingga` | Rutan IIB Purbalingga |
| `rembang` | Rutan IIB Rembang |
| `sragen` | Lapas IIA Sragen |
| `temanggung` | Rutan IIB Temanggung |
| `wonogiri` | Lapas IIB Wonogiri |
| `wonosobo` | Rutan IIB Wonosobo |
| `salatiga` | Rutan IIB Salatiga |

## Tanpa UPT (2 portal)

`karanganyar`, `sukoharjo`.

## Subdomain per daerah (31 portal)

Keputusan owner 2026-09-17: portal per daerah, kab/kota senama digabung.
Pola hostname `{subdomain}.{domain-media}` mengikuti preseden `wonosobo.*`
(9 domain aktif). Aturan: satu label (aman wildcard SSL), nama polos,
tabrakan antar-provinsi kelak ditambah provinsi (`banjar-jabar`).

| Daerah | Cakupan | Subdomain |
|---|---|---|
| Banjarnegara | Kab. | `banjarnegara` |
| Banyumas | Kab. | `banyumas` |
| Batang | Kab. | `batang` |
| Blora | Kab. | `blora` |
| Boyolali | Kab. | `boyolali` |
| Brebes | Kab. | `brebes` |
| Cilacap | Kab. | `cilacap` |
| Demak | Kab. | `demak` |
| Grobogan | Kab. | `grobogan` |
| Jepara | Kab. | `jepara` |
| Karanganyar | Kab. | `karanganyar` |
| Kebumen | Kab. | `kebumen` |
| Kendal | Kab. | `kendal` |
| Klaten | Kab. | `klaten` |
| Kudus | Kab. | `kudus` |
| Magelang | Kab. + Kota | `magelang` |
| Pati | Kab. | `pati` |
| Pekalongan | Kab. + Kota | `pekalongan` |
| Pemalang | Kab. | `pemalang` |
| Purbalingga | Kab. | `purbalingga` |
| Purworejo | Kab. | `purworejo` |
| Rembang | Kab. | `rembang` |
| Salatiga | Kota | `salatiga` |
| Semarang | Kab. + Kota | `semarang` |
| Sragen | Kab. | `sragen` |
| Sukoharjo | Kab. | `sukoharjo` |
| Surakarta | Kota | `surakarta` |
| Tegal | Kab. + Kota | `tegal` |
| Temanggung | Kab. | `temanggung` |
| Wonogiri | Kab. | `wonogiri` |
| Wonosobo | Kab. | `wonosobo` ✅ live |

Jumlah: 31 subdomain × 9 domain = **279 hostname** Jateng penuh
(hari ini 9 live, semua `wonosobo.*`).

## Catatan pemetaan

- Lima baris di DB ber-`city` generik/salah sehingga regionnya diturunkan dari
  alamat: Plantungan → Kab. Kendal, LPKA Kutoarjo → Kab. Purworejo, Rutan
  Banjarnegara → Kab. Banjarnegara, Slawi → Kab. Tegal, Bapas Magelang →
  Kab. Magelang. Selaras dengan usulan rapihan Gap 3.
- Jebakan nama: Lapas Khusus Karanganyar berada di Nusakambangan
  (Kab. Cilacap), bukan Kab. Karanganyar.
- Singkatan: NK = Nusakambangan; I/IIA/IIB = kelas.
