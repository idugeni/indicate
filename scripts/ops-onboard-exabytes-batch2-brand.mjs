/**
 * One-off ops: upload the gradient letter logo + favicon (512x512) for the
 * Exabytes batch-2 apex tenants to the private R2 bucket and print a compact
 * manifest. Database writes happen through the privileged migration path
 * because the runtime pooler role is subject to RLS on `media`.
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORG = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0';
const ACCOUNT = '2fa5c3941e008ed06e4b41d7342d3fa9';
const BUCKET = 'indicate-media-private';

const TENANTS = [
  ['lensamata.web.id', '65772c41-9db2-446a-ba48-05b7aef21b16', 'l'],
  ['pikiranpublik.web.id', '8527ee9b-a8f8-428b-bb2c-bd93c3d28d15', 'p'],
  ['suaradata.web.id', '42a2a709-cedf-49ad-9e45-96c474099f40', 's'],
  ['fokusrakyat.web.id', '26ffc258-f985-47f1-8989-8d0e3494e318', 'f'],
  ['lensakita24.my.id', '7d3cfe90-efd1-4542-8568-e292d26ec7f1', 'l'],
  ['sudutfakta7.my.id', '2cee3673-fa88-466d-b602-624de69b5563', 's'],
  ['narasipublik.biz.id', '0b1e7ba3-0218-4600-aab9-676d27369aba', 'n'],
  ['titikberita9.biz.id', 'f7fae72c-2ebf-4af8-91ce-32fc9b1a6f12', 't'],
  ['mediasatu24.biz.id', '97d4cfc4-2677-488e-8b48-7b0fe2b20fbb', 'm'],
  ['ruangredaksi.web.id', '7910d565-bd10-4097-a75c-53c2b618f313', 'r'],
  ['resonansi.web.id', '43d8e3a8-d960-4617-b0d2-b84f2252e602', 'r'],
  ['eksposur.web.id', '1e8975ab-f5fb-46b9-8324-ddd6050af557', 'e'],
  ['aspirasi.biz.id', '48b642aa-e821-4384-b25d-a24a847a23fb', 'a'],
  ['refleksi.biz.id', 'f258acf7-a3f0-417b-b7b7-3a09e49d4448', 'r'],
  ['sintesa.biz.id', '3d46b2f3-66c2-4bbb-b28e-7375f33467da', 's'],
  ['proyeksi.web.id', 'c1febb85-d8c0-4532-a54c-c854e06ccb3d', 'p'],
  ['observasi.web.id', '95b6287c-e9aa-4e81-a384-455a38c3428e', 'o'],
  ['konstelasi.my.id', '48048acc-f6b7-4404-bb96-e924013f1556', 'k'],
  ['artikulasi.biz.id', '54ec2f38-f96f-46ea-bdac-c2b4c2805461', 'a'],
  ['interpretasi.web.id', '3460c9d9-e2df-42d6-b750-738132b10e6f', 'i'],
];

function loadEnvFile(path) {
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}

loadEnvFile(join(ROOT, '.env'));

async function main() {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const ymd = `${year}-${month}-${day}`;
  const manifest = [];

  for (const [hostname, siteId, letter] of TENANTS) {
    const bytes = readFileSync(join(ROOT, 'docs', 'templates', 'brand', 'gradient', `letter-${letter}-grad.png`));
    const hex = createHash('sha256').update(bytes).digest('hex');
    const b64 = createHash('sha256').update(bytes).digest('base64');
    const slug = hostname.replace(/\./g, '-');

    for (const purpose of ['site-logo', 'site-favicon']) {
      const token = randomBytes(8).toString('hex');
      const key = `o/${ORG}/p/${purpose}/y=${year}/m=${month}/site/${siteId}/${ymd}-${purpose}-${slug}-${token}.png`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: key, Body: bytes, ContentType: 'image/png', ChecksumSHA256: b64,
      }));
      const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      if (head.ContentLength !== bytes.length) throw new Error(`size_mismatch:${key}`);
      manifest.push({ host: hostname, site: siteId, purpose, token, bytes: bytes.length, hex });
    }
  }

  console.log(JSON.stringify(manifest));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
