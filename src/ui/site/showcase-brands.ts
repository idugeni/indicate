export interface ShowcaseBrand {
  readonly name: string;
  readonly initials: string;
  readonly category: string;
  readonly tagline: string;
  readonly accent: string;
  readonly head: string;
  readonly tail: string;
  readonly wordmarkClass: string;
}

const WORDMARK_SERIF_BLACK = 'font-serif font-black tracking-tight';
const WORDMARK_SERIF_ITALIC = 'font-serif font-black tracking-tight italic';
const WORDMARK_SERIF_SOFT = 'font-serif font-bold tracking-tight italic';
const WORDMARK_SANS_TIGHT = 'font-sans font-bold tracking-tight uppercase';
const WORDMARK_SANS_LOW = 'font-sans font-bold lowercase tracking-tight';
const WORDMARK_SANS_WIDE = 'font-sans font-bold uppercase tracking-[0.08em]';
const WORDMARK_MONO_LOW = 'font-mono font-bold lowercase tracking-tight';
const WORDMARK_MONO_UP = 'font-mono font-bold uppercase tracking-tight';

export const SHOWCASE_BRANDS: readonly [
  ShowcaseBrand,
  ShowcaseBrand,
  ShowcaseBrand,
  ShowcaseBrand,
  ShowcaseBrand,
  ShowcaseBrand,
  ShowcaseBrand,
  ShowcaseBrand,
  ShowcaseBrand,
] = Object.freeze([
  {
    name: 'Aruna Pos',
    initials: 'AP',
    category: 'Nasional',
    tagline: 'Kabar utama setiap pagi',
    accent: '#8a5f1c',
    head: 'Aruna',
    tail: ' Pos',
    wordmarkClass: WORDMARK_SERIF_BLACK,
  },
  {
    name: 'Cakra Warta',
    initials: 'CW',
    category: 'Metropolitan',
    tagline: 'Denyut kota, terverifikasi',
    accent: '#1a2430',
    head: 'Cakra',
    tail: ' Warta',
    wordmarkClass: WORDMARK_SANS_TIGHT,
  },
  {
    name: 'Lintas Nusa',
    initials: 'LN',
    category: 'Regional',
    tagline: 'Jembatan antar daerah',
    accent: '#2f4a3e',
    head: 'lintas',
    tail: 'nusa',
    wordmarkClass: WORDMARK_SANS_LOW,
  },
  {
    name: 'Fakta Pagi',
    initials: 'FP',
    category: 'Harian',
    tagline: 'Fakta dulu, opini kemudian',
    accent: '#27435f',
    head: 'Fakta',
    tail: ' Pagi.',
    wordmarkClass: WORDMARK_SERIF_ITALIC,
  },
  {
    name: 'Jurnal Kita',
    initials: 'JK',
    category: 'Edukasi',
    tagline: 'Belajar dari peristiwa',
    accent: '#4b3f66',
    head: 'jurnal',
    tail: '.kita',
    wordmarkClass: WORDMARK_MONO_LOW,
  },
  {
    name: 'Kabar Lestari',
    initials: 'KL',
    category: 'Lingkungan',
    tagline: 'Merawat bumi lewat berita',
    accent: '#2e5b3f',
    head: 'Kabar',
    tail: ' Lestari',
    wordmarkClass: WORDMARK_SERIF_SOFT,
  },
  {
    name: 'Pena Merdeka',
    initials: 'PM',
    category: 'Opini',
    tagline: 'Ruang gagasan terbuka',
    accent: '#7c3030',
    head: 'Pena',
    tail: ' Merdeka',
    wordmarkClass: WORDMARK_SANS_WIDE,
  },
  {
    name: 'Sora Ekonomi',
    initials: 'SE',
    category: 'Bisnis',
    tagline: 'Angka yang bisa dibaca',
    accent: '#1f5c66',
    head: 'Sora',
    tail: '/Ekonomi',
    wordmarkClass: WORDMARK_MONO_UP,
  },
  {
    name: 'Warta Bumi',
    initials: 'WB',
    category: 'Sains',
    tagline: 'Riset untuk publik',
    accent: '#3d4b2f',
    head: 'Warta',
    tail: ' Bumi',
    wordmarkClass: WORDMARK_SERIF_BLACK,
  },
]);

export const SHOWCASE_REGIONAL_EDITIONS: readonly string[] = Object.freeze([
  'Edisi Bandung',
  'Edisi Surabaya',
  'Edisi Medan',
  'Edisi Makassar',
  '+ edisi daerah lain',
]);
