import { Buffer } from 'node:buffer';

const COUNT = 100;
const BUDGET_BYTES = 150 * 1024;

let seed = 42;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const text = (len) => Array.from({ length: len }, () => pick('abcdefghijklmnopqrstuvwxyz ,.-')).join('');

const words = ['pemerintah', 'daerah', 'program', 'pelayanan', 'publik', 'pembangunan', 'kegiatan', 'rapat', 'kerja', 'masyarakat'];

function fullItem(i) {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    slug: `berita-kegiatan-pemerintah-daerah-${i}`,
    title: `Kegiatan pelayanan publik pemerintah daerah program kerja ${i} ${text(20)}`.slice(0, 90),
    description: text(180),
    tags: [pick(words), pick(words), pick(words)],
    regionId: '11111111-1111-4111-8111-111111111111',
    categoryId: '22222222-2222-4222-8222-222222222222',
    categorySlug: 'pemerintahan',
    categoryName: 'Pemerintahan',
    authorName: 'Redaksi Portal',
    authorDisplayName: 'Redaksi Portal Berita',
    authorBio: text(200),
    authorAvatarUrl: `https://portal.example/api/network/media/avatar-${i}`,
    publisherName: 'Dinas Komunikasi dan Informatika',
    attribution: 'Diskominfo',
    publisherLogoUrl: 'https://portal.example/api/network/media/logo-1',
    publisherCity: 'Kota Contoh',
    publisherBio: text(400),
    publisherSocials: { website: 'https://example.go.id', instagram: 'https://instagram.com/contoh', facebook: 'https://facebook.com/contoh' },
    publisherVerified: true,
    independent: false,
    officialInstitution: 'Pemerintah Kota Contoh',
    publishedAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
    articleSiteId: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
    viewCount: Math.floor(rand() * 5000),
    imageUrl: `https://portal.example/api/network/media/cover-${i}`,
    thumbnailUrl: `https://portal.example/api/network/media/cover-${i}?variant=thumb`,
    imageMediaType: 'image/webp',
    imageWidth: null,
    imageHeight: null,
  };
}

function leanItem(item) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    categorySlug: item.categorySlug,
    categoryName: item.categoryName,
    publishedAt: item.publishedAt,
    imageUrl: item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
  };
}

const full = Array.from({ length: COUNT }, (_, i) => fullItem(i));
const lean = full.map(leanItem);
const sizeOf = (v) => Buffer.byteLength(JSON.stringify(v), 'utf8');
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

const before = sizeOf(full);
const after = sizeOf(lean);
console.log(`artikel         : ${COUNT}`);
console.log(`sebelum         : ${kb(before)} (${before} B, ${(before / COUNT).toFixed(0)} B/artikel)`);
console.log(`sesudah (lean)  : ${kb(after)} (${after} B, ${(after / COUNT).toFixed(0)} B/artikel)`);
console.log(`hemat           : ${(((before - after) / before) * 100).toFixed(1)}%`);
console.log(`budget          : ${kb(BUDGET_BYTES)}`);
console.log(after < BUDGET_BYTES ? 'PASS: payload sesudah di bawah budget' : 'FAIL: payload sesudah melebihi budget');
process.exit(after < BUDGET_BYTES ? 0 : 1);
