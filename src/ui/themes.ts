/** INDICATE media network theme & template registry (national scope). */

export interface NetworkColorPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly primary: string;
  readonly accent: string;
  readonly headerBg?: string;
}

export interface MasterTemplatePreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'news' | 'editorial' | 'tech' | 'official' | 'visual' | 'live';
}

/** 10 semantic non-numbered network color presets. */
export const NETWORK_COLOR_PRESETS: readonly NetworkColorPreset[] = [
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    description: 'Warna hijau zamrud & emas kuningan. Cocok untuk portal daerah pertanian & pertumbuhan ekonomi.',
    primary: '#0b5d4b',
    accent: '#e9a23b',
    headerBg: '#0e1320',
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    description: 'Warna biru safir & biru terang. Cocok untuk media metropolitan, bisnis, & kebijakan publik.',
    primary: '#1e3a8a',
    accent: '#3b82f6',
    headerBg: '#0f172a',
  },
  {
    id: 'crimson-torch',
    name: 'Crimson Torch',
    description: 'Warna merah marun & oranye hangat. Cocok untuk headline breaking news & olahraga.',
    primary: '#991b1b',
    accent: '#f97316',
    headerBg: '#18181b',
  },
  {
    id: 'oceanic-cyan',
    name: 'Oceanic Cyan',
    description: 'Warna teal samudra & sian menyala. Cocok untuk media wilayah pesisir & pariwisata.',
    primary: '#0f766e',
    accent: '#06b6d4',
    headerBg: '#091e25',
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    description: 'Warna hitam obsidian & emas klasik. Cocok untuk jurnalistik investigasi & opini publik.',
    primary: '#18181b',
    accent: '#cc9a44',
    headerBg: '#0e1320',
  },
  {
    id: 'deep-violet',
    name: 'Deep Violet',
    description: 'Warna ungu pekat & lavender. Cocok untuk media kebudayaan, keenam seni, & gaya hidup.',
    primary: '#581c87',
    accent: '#c084fc',
    headerBg: '#1a102f',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    description: 'Warna cokelat tembaga & amber terbenam. Cocok untuk berita daerah pegunungan & UMKM.',
    primary: '#7c2d12',
    accent: '#fb923c',
    headerBg: '#1c1917',
  },
  {
    id: 'slate-monochrome',
    name: 'Slate Monochrome',
    description: 'Warna abu-abu baja & perak murni. Cocok untuk pers resmi humas & pemerintah daerah.',
    primary: '#334155',
    accent: '#94a3b8',
    headerBg: '#0f172a',
  },
  {
    id: 'terracotta-earth',
    name: 'Terracotta Earth',
    description: 'Warna terakota tanah & jingga hangat. Cocok untuk media komunitas daerah & kearifan lokal.',
    primary: '#9a3412',
    accent: '#fdba74',
    headerBg: '#1c1917',
  },
  {
    id: 'pine-forest',
    name: 'Pine Forest',
    description: 'Warna hijau pinus & mint segar. Cocok untuk media lingkungan hidup & komunitas lokal.',
    primary: '#14532d',
    accent: '#4ade80',
    headerBg: '#062012',
  },
];

/** 11 semantic non-numbered master template layouts. */
export const MASTER_TEMPLATE_PRESETS: readonly MasterTemplatePreset[] = [
  {
    id: 'portal-news',
    name: 'Portal News Standard',
    description: 'Layout surat kabar digital 2-kolom klasik dengan breaking news ticker & widget terpopuler.',
    category: 'news',
  },
  {
    id: 'editorial-magazine',
    name: 'Editorial Magazine',
    description: 'Layout majalah berwibawa dengan tipografi judul besar & kolom opini redaksi.',
    category: 'editorial',
  },
  {
    id: 'modern-tech',
    name: 'Modern Tech Grid',
    description: 'Layout majalah teknologi dengan grid asimetris, badge menyala, & header melayang.',
    category: 'tech',
  },
  {
    id: 'minimal-press',
    name: 'Minimal Official Press',
    description: 'Layout bersih & resmi untuk pengumuman instansi pemerintah & siaran pers humas.',
    category: 'official',
  },
  {
    id: 'multimedia-visual',
    name: 'Multimedia Visual',
    description: 'Layout berfokus pada galeri foto resolusi tinggi & berita video dokumenter.',
    category: 'visual',
  },
  {
    id: 'tabloid-express',
    name: 'Tabloid Express',
    description: 'Layout berita kilat dengan banner headline besar & kartu berita cepat.',
    category: 'news',
  },
  {
    id: 'columnist-opinion',
    name: 'Columnist & Opinion',
    description: 'Layout esai & opini wartawan dengan fokus keterbacaan artikel panjang.',
    category: 'editorial',
  },
  {
    id: 'geo-radar',
    name: 'Geo Radar',
    description: 'Layout berita berbasis peta & navigasi kewilayahan.',
    category: 'news',
  },
  {
    id: 'compact-stream',
    name: 'Compact Live Stream',
    description: 'Layout timeline berita cepat real-time dengan update detik per detik.',
    category: 'live',
  },
  {
    id: 'broadsheet-classic',
    name: 'Broadsheet Classic',
    description: 'Layout koran cetak korporat dengan pembatas garis vertikal lurus.',
    category: 'news',
  },
  {
    id: 'clean-blue',
    name: 'Clean Blue Editorial',
    description: 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.',
    category: 'news',
  },
];
