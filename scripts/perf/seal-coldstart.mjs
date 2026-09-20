import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const watermark = read('src/modules/billing/seal-watermark.ts');
const sealRoute = read('src/app/api/dashboard/billing/invoice/[id]/seal/route.ts');
const nextConfig = read('next.config.ts');

const checks = [
  ['watermark memakai dynamic import sharp', /await\s+import\(['"]sharp['"]\)/.test(watermark)],
  ['tidak ada static import sharp di watermark', !/^\s*import\s+.*from\s+['"]sharp['"]/m.test(watermark) && !/require\(['"]sharp['"]\)/.test(watermark)],
  ['route seal tidak mengimpor sharp langsung', !/sharp/.test(sealRoute)],
  ['route seal mendelegasikan ke watermarkStamp', /watermarkStamp/.test(sealRoute)],
  ['watermark hanya di jalur stamp', /type\s*===\s*['"]stamp['"]\s*\?\s*await\s+watermarkStamp/.test(sealRoute)],
  ['sharp tetap server-external di next.config', /serverExternalPackages[\s\S]*['"]sharp['"]/.test(nextConfig)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed += 1;
}

const t0 = performance.now();
try {
  await import('sharp');
  console.log(`INFO: import('sharp') butuh ${((performance.now() - t0)).toFixed(0)} ms (biaya cold-start yang dihindari di jalur non-stamp)`);
} catch {
  console.log('INFO: sharp tidak terinstal di environment ini, pengukuran waktu dilewati');
}
process.exit(failed === 0 ? 0 : 1);
