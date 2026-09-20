import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const watermark = read('src/modules/billing/seal-watermark.ts');
const sealRoute = read('src/app/api/dashboard/billing/invoice/[id]/seal/route.ts');
const nextConfig = read('next.config.ts');

function collectTsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      collectTsFiles(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const staticSharpPattern = /^\s*import\s+.*from\s+['"]sharp['"]/m;
const requireSharpPattern = /require\(['"]sharp['"]\)/;
const offenders = [];
for (const file of collectTsFiles(join(ROOT, 'src'))) {
  if (file.endsWith(join('billing', 'seal-watermark.ts'))) continue;
  const content = readFileSync(file, 'utf8');
  if (staticSharpPattern.test(content) || requireSharpPattern.test(content)) {
    offenders.push(file.replace(`${ROOT}\\`, '').replace(`${ROOT}/`, ''));
  }
}

const checks = [
  ['watermark memakai dynamic import sharp', /await\s+import\(['"]sharp['"]\)/.test(watermark)],
  ['tidak ada static import sharp di watermark', !/^\s*import\s+.*from\s+['"]sharp['"]/m.test(watermark) && !/require\(['"]sharp['"]\)/.test(watermark)],
  ['route seal tidak mengimpor sharp langsung', !/sharp/.test(sealRoute)],
  ['route seal mendelegasikan ke watermarkStamp', /watermarkStamp/.test(sealRoute)],
  ['watermark hanya di jalur stamp', /type\s*===\s*['"]stamp['"]\s*\?\s*await\s+watermarkStamp/.test(sealRoute)],
  ['sharp tetap server-external di next.config', /serverExternalPackages[\s\S]*['"]sharp['"]/.test(nextConfig)],
  ['tidak ada static import sharp di rute non-stamp', offenders.length === 0],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed += 1;
}
if (offenders.length > 0) {
  console.log(`FAIL detail (${offenders.length} file):`);
  for (const file of offenders) console.log(`  - ${file}`);
}

const t0 = performance.now();
try {
  await import('sharp');
  console.log(`INFO: import('sharp') butuh ${((performance.now() - t0)).toFixed(0)} ms (biaya cold-start yang dihindari di jalur non-stamp)`);
} catch {
  console.log('INFO: sharp tidak terinstal di environment ini, pengukuran waktu dilewati');
}
process.exit(failed === 0 ? 0 : 1);
