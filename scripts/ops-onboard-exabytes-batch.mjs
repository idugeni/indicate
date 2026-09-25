/**
 * One-off ops stage 1: upload the gradient letter logo + favicon (512x512)
 * for the 10 new Exabytes apex tenants to the private R2 bucket and print a
 * compact manifest.
 *
 * Database writes are NOT done here: the runtime pooler role is subject to
 * RLS on `media`, so the manifest is applied through the privileged
 * migration path instead (same split as `backfill-tenant-default-og.mjs`).
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
  ['sudutindonesia.web.id', 'a3455b8a-1271-41a9-ad26-cddf1f862b65', 's'],
  ['ruangpublik.web.id', '2f812968-c40d-4c02-8c29-5b6ae33a2aa2', 'r'],
  ['garisberita.web.id', '7e3f04b0-eeb9-42be-98d0-12d099ce50b7', 'g'],
  ['titikmedia.my.id', '28146b7a-a024-4658-b426-d688e6ecfa26', 't'],
  ['suarapublik.biz.id', 'd89e309f-9251-4c19-89e9-552d9f083c52', 's'],
  ['berandanasional.web.id', 'e40ca148-2d19-4e0b-bf56-d54b220f9519', 'b'],
  ['kabarutama.web.id', 'e76ab849-3b05-43f5-9e63-1cd276feb0c4', 'k'],
  ['fokusrakyat.my.id', 'acf26de0-1df4-4ea9-8b6a-98e76ffbd8f8', 'f'],
  ['pusatmedia.biz.id', '50a41931-ac98-4ed7-8d2a-d884deafb644', 'p'],
  ['wartapersada.my.id', '44b198ba-4cab-438c-9f87-3c2482c729b0', 'w'],
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
  const stamp = now.toISOString();
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
      manifest.push({
        host: hostname, site: siteId, purpose, key,
        bytes: bytes.length, hex, stamp,
      });
    }
  }

  console.log(JSON.stringify(manifest));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
