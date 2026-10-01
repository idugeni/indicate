import type { PromptTask } from '@/modules/ai/prompt-registry';

/**
 * Satu kasus emas: input redaksi plus output model tiruan.
 *
 * @param id - Identifikasi unik kasus.
 * @param task - Tugas yang dinilai runner.
 * @param title - Judul artikel masukan.
 * @param body - Isi artikel masukan.
 * @param modelOutput - Output JSON tiruan model yang dinilai bentuknya.
 */
export interface GoldenFixture {
  readonly id: string;
  readonly task: PromptTask;
  readonly title: string;
  readonly body: string;
  readonly modelOutput: string;
}

/**
 * Fixtures emas kecil untuk eval prompt tanpa memanggil provider.
 *
 * @remarks Ekspektasi dinilai dari bentuk dan aturan parser (jumlah,
 * panjang, JSON valid), bukan dari kesamaan string dengan output model.
 */
export const GOLDEN_FIXTURES: readonly GoldenFixture[] = [
  {
    id: 'seo-banjir',
    task: 'seo-bundle',
    title: 'Banjir Rendam Tiga Desa di Wonosobo',
    body: 'Air setinggi lutut merendam tiga desa di Wonosobo sejak Selasa pagi. BPBD menyalurkan bantuan dan mendata rumah terdampak.',
    modelOutput: JSON.stringify({
      titles: [
        'Banjir Rendam Tiga Desa di Wonosobo',
        'BPBD Salurkan Bantuan ke Desa Terdampak Banjir',
        'Pendataan Rumah Terdampak Banjir Wonosobo Berlanjut',
      ],
      meta_description: 'Banjir merendam tiga desa di Wonosobo sejak Selasa pagi. BPBD menyalurkan bantuan dan mendata rumah warga yang terdampak.',
      excerpt: 'Banjir setinggi lutut merendam tiga desa di Wonosobo. BPBD menyalurkan bantuan dan mendata rumah terdampak.',
    }),
  },
  {
    id: 'seo-pasar',
    task: 'seo-bundle',
    title: 'Pasar Induk Magelang Terbakar',
    body: 'Kebakaran melanda puluhan kios Pasar Induk Magelang pada Jumat dini hari. Petugas memadamkan api selama tiga jam.',
    modelOutput: JSON.stringify({
      titles: ['Kebakaran Landa Puluhan Kios Pasar Induk Magelang', 'Api Padam Setelah Tiga Jam Penanganan Petugas'],
      meta_description: 'Kebakaran melanda puluhan kios Pasar Induk Magelang pada Jumat dini hari dan dipadamkan petugas selama tiga jam.',
      excerpt: 'Kebakaran melanda puluhan kios Pasar Induk Magelang. Petugas memadamkan api selama tiga jam.',
    }),
  },
  {
    id: 'seo-pagar-kode',
    task: 'seo-bundle',
    title: 'Jalan Provinsi Rusak di Banjarnegara',
    body: 'Ruas jalan provinsi di Banjarnegara rusak di beberapa titik. Warga meminta perbaikan sebelum musim hujan tiba.',
    modelOutput: '```json\n{"titles":["Jalan Provinsi Rusak di Banjarnegara","Warga Minta Perbaikan Sebelum Hujan"],"meta_description":"Ruas jalan provinsi di Banjarnegara rusak di beberapa titik dan warga meminta perbaikan.","excerpt":"Jalan provinsi di Banjarnegara rusak di beberapa titik."}\n```',
  },
  {
    id: 'polish-naskah',
    task: 'polish',
    title: 'Panen Raya Tembakau',
    body: 'Petani memanen tembakau. Harga naik. Cuaca mendukung.',
    modelOutput: JSON.stringify({
      body: 'Petani memanen tembakau di tengah cuaca yang mendukung.\n\nHarga jual naik mengikuti kualitas panen musim ini.',
    }),
  },
  {
    id: 'polish-pagar-kode',
    task: 'polish',
    title: 'Festival Budaya',
    body: 'Ribuan warga hadiri festival. Acara berlangsung meriah.',
    modelOutput: '```json\n{"body":"Ribuan warga menghadiri festival budaya yang berlangsung meriah."}\n```',
  },
  {
    id: 'caption-sampul',
    task: 'caption',
    title: 'Gotong Royong Bersihkan Sungai',
    body: 'Warga membersihkan sungai dari sampah pada Minggu pagi.',
    modelOutput: JSON.stringify({
      alt: 'Warga membersihkan sampah di aliran sungai pada pagi hari.',
      caption: 'Warga bergotong royong membersihkan sungai pada Minggu pagi.',
    }),
  },
];
