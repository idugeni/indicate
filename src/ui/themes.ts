/** INDICATE media network theme & template registry (national scope). */

export interface MasterTemplatePreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'news' | 'editorial' | 'tech' | 'official' | 'visual' | 'live';
}

/** Master template layouts: Clean Blue + 9 new tenant variants. */
export const MASTER_TEMPLATE_PRESETS: readonly MasterTemplatePreset[] = [
  {
    id: 'clean-blue',
    name: 'Clean Blue Editorial',
    description: 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.',
    category: 'news',
  },
  {
    id: 'black-lime',
    name: 'Black Lime Pulse',
    description: 'Dark pekat aksen lime: hero split, ticker pil, kartu 4 kolom, panel paling dibaca.',
    category: 'news',
  },
  {
    id: 'dark-navy',
    name: 'Dark Navy Modern',
    description: 'Navy gelap modern: hero overlay, list horizontal, panel paling dibaca dan newsletter.',
    category: 'news',
  },
  {
    id: 'glassy-blue',
    name: 'Glassy Blue',
    description: 'Kaca biru terang: hero kartu kaca, pil kategori, kartu 3 kolom dan perspektif.',
    category: 'news',
  },
  {
    id: 'green-minimal',
    name: 'Green Minimal',
    description: 'Hijau minimal natural: hero split, list editorial, newsletter daun.',
    category: 'news',
  },
  {
    id: 'orange-modern',
    name: 'Orange Modern',
    description: 'Oranye modern: hero split kanan, kartu 4 kolom, panel perspektif senja.',
    category: 'news',
  },
  {
    id: 'purple-editorial',
    name: 'Purple Digital Editorial',
    description: 'Ungu digital: hero kartu bulat, pil pastel, quote gradien dan newsletter.',
    category: 'editorial',
  },
  {
    id: 'red-editorial',
    name: 'Red Editorial',
    description: 'Merah editorial serif: hero split klasik, daftar bernomor, panel marun.',
    category: 'editorial',
  },
  {
    id: 'soft-blue',
    name: 'Soft Blue Cards',
    description: 'Kartu biru lembut: hero kartu putih, kartu horizontal 2 kolom, newsletter pos.',
    category: 'news',
  },
  {
    id: 'warm-editorial',
    name: 'Warm Editorial',
    description: 'Terakota hangat serif: hero split krem, kartu 3 kolom, quote senja.',
    category: 'editorial',
  },
];
