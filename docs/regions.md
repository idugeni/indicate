# Rooster Provinsi Indonesia

Halaman ini adalah sumber nama tunggal untuk geografi tingkat provinsi di
`regions`. Data live: **38 provinsi** untuk setiap organisasi yang sudah memakai
geografi, ditulis oleh migrasi
`20260925210000_indonesia_province_roster.sql` (ledger versi 188).

Kota bukan tabel terpisah: kota adalah baris `regions` dengan
`kind = 'city'` dan `parent_region_id` menunjuk provinsinya, sehingga satu
hierarki `apex → region → city` berlaku untuk portal maupun geografi.

## Aturan penamaan

Satu geografi punya beberapa nama karena beberapa kebutuhan berbeda.
Mencampurnya justru merusak URL, SEO, atau keterbacaan dashboard.

| Kolom | Isi | Dipakai untuk |
|---|---|---|
| `name` | Nama resmi | Teks pembaca, judul, sitemap, SEO, label form |
| `short_name` | Nama pendek yang dikenal publik (`Jateng`, `Jabar`, `DIY`) | UI padat, kode redaksi, daftar ringkas |
| `slug` | Label DNS kebab lowercase | Hostname portal, `{slug}.{apex}` |
| `external_key` | Kunci mesin | Perbandingan internal; mengikuti `slug` |

Aturan yang dipegang:

- `name` tidak pernah disingkat: yang tampil ke pembaca tetap nama resmi.
- `slug` mengikuti nama resmi dengan bentuk kebab, konsisten dengan slug kota
  yang sudah live (`banjarnegara`, `surakarta`) dan portal provinsi yang sudah
  live (`jawa-tengah.{apex}`). Karena 104 portal provinsi sudah-serving di
  hostname itu, slug tidak diubah hanya demi lebih pendek.
- `short_name` boleh bernilai `null`. Geografi tanpa nama pendek yang dikenal
  tidak dipaksa mengarang; label apa pun memakai `name` sebagai cadangan.
- Panjang `short_name` 1-40 karakter, dijaga `regions_short_name_length_check`.

## Roster

| `name` | `short_name` | `slug` |
|---|---|---|
| Aceh | Aceh | `aceh` |
| Sumatera Utara | Sumut | `sumatera-utara` |
| Sumatera Barat | Sumbar | `sumatera-barat` |
| Riau | Riau | `riau` |
| Jambi | Jambi | `jambi` |
| Sumatera Selatan | Sumsel | `sumatera-selatan` |
| Bengkulu | Bengkulu | `bengkulu` |
| Lampung | Lampung | `lampung` |
| Kepulauan Bangka Belitung | Babel | `bangka-belitung` |
| Kepulauan Riau | Kepri | `kepulauan-riau` |
| Daerah Khusus Jakarta | DKI | `dki-jakarta` |
| Jawa Barat | Jabar | `jawa-barat` |
| Jawa Tengah | Jateng | `jawa-tengah` |
| Daerah Istimewa Yogyakarta | DIY | `di-yogyakarta` |
| Jawa Timur | Jatim | `jawa-timur` |
| Banten | Banten | `banten` |
| Bali | Bali | `bali` |
| Nusa Tenggara Barat | NTB | `nusa-tenggara-barat` |
| Nusa Tenggara Timur | NTT | `nusa-tenggara-timur` |
| Kalimantan Barat | Kalbar | `kalimantan-barat` |
| Kalimantan Tengah | Kalteng | `kalimantan-tengah` |
| Kalimantan Selatan | Kalsel | `kalimantan-selatan` |
| Kalimantan Timur | Kaltim | `kalimantan-timur` |
| Kalimantan Utara | Kalut | `kalimantan-utara` |
| Sulawesi Utara | Sulut | `sulawesi-utara` |
| Sulawesi Tengah | Sulteng | `sulawesi-tengah` |
| Sulawesi Selatan | Sulsel | `sulawesi-selatan` |
| Sulawesi Tenggara | Sultra | `sulawesi-tenggara` |
| Gorontalo | Gorontalo | `gorontalo` |
| Sulawesi Barat | Sulbar | `sulawesi-barat` |
| Maluku | Maluku | `maluku` |
| Maluku Utara | Malut | `maluku-utara` |
| Papua Barat | Papua Barat | `papua-barat` |
| Papua Barat Daya | Papua Barat Daya | `papua-barat-daya` |
| Papua | Papua | `papua` |
| Papua Selatan | Papua Selatan | `papua-selatan` |
| Papua Tengah | Papua Tengah | `papua-tengah` |
| Papua Pegunungan | Papua Pegunungan | `papua-pegunungan` |

## Yang belum ada

Roster ini hanya geografi. Tidak ada portal baru: tidak ada `region` Site
`<slug>.{apex}` untuk 37 provinsi tanpa kota, tidak ada kota di luar Jawa
Tengah, dan tidak ada DNS atau cache yang berubah. Portal provinsi tetap
`jawa-tengah.{apex}` dengan 31 kota turunan, persis seperti sebelum migrasi
ini. Daftar kota 31 dan afiliasi 59 UPT tetap di
[tenants/upt-jateng.md](tenants/upt-jateng.md).
