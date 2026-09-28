/**
 * Mark legacy private media as non-cacheable instead of publicly cacheable.
 *
 * `R2ObjectStorageAdapter.authorizeExactPut` only stamps
 * `public, max-age=31536000, immutable` on a `pub/` key, so current code
 * cannot produce the defect. The 22 `article-inline` objects still carry it
 * from before the public/private bucket split landed in `aaef27d`, which
 * stamped the header on every object regardless of bucket.
 *
 * The field is inert while the private bucket has no public route — the
 * managed domain is disabled and no custom domain is attached — so this is a
 * booby trap rather than a leak. Removing it is not enough on its own: absent
 * metadata falls back to a heuristic, so the repair writes
 * `private, no-store` instead. Should a public route ever be attached to the
 * private bucket, these objects then fail closed rather than being handed to
 * a shared cache.
 *
 * The rewrite is byte-identical and key-preserving, so `media.checksum`,
 * the object key, and every reference stay valid; only the stored metadata and
 * `LastModified` change.
 *
 * Modes:
 *   node scripts/fix-private-media-cache-control.mjs
 *     lists offending objects and changes nothing.
 *   node scripts/fix-private-media-cache-control.mjs --apply
 *     rewrites each one with `private, no-store`.
 *
 * `--bucket <name>` overrides `indicate-media-private`. Credentials come from
 * the repo `.env` (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACCOUNT_ID = '2fa5c3941e008ed06e4b41d7342d3fa9';
const DEFAULT_BUCKET = 'indicate-media-private';
const PRIVATE_CACHE_CONTROL = 'private, no-store';

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

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

async function collectOffenders(client, bucket) {
  const offenders = [];
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
    for (const object of page.Contents ?? []) {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: object.Key }));
      const cacheControl = head.CacheControl;
      if (typeof cacheControl === 'string' && cacheControl.startsWith('public')) {
        offenders.push({ Key: object.Key, Size: head.ContentLength, CacheControl: cacheControl });
      }
    }
    continuationToken = page.IsTruncated === true ? page.NextContinuationToken : undefined;
  } while (continuationToken !== undefined);
  return offenders;
}

async function bodyBytes(response) {
  const bytes = [];
  for await (const chunk of response.Body) bytes.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(bytes);
}

loadEnvFile(join(ROOT, '.env'));
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
if (accessKeyId === undefined || secretAccessKey === undefined) {
  throw new Error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set in .env');
}

const bucket = argValue('--bucket') ?? DEFAULT_BUCKET;
const apply = process.argv.includes('--apply');
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const offenders = await collectOffenders(client, bucket);
console.log(`${bucket}: ${offenders.length} object(s) with a public cache-control${apply ? '' : ' (dry run)'}`);
for (const object of offenders) {
  console.log(`  ${object.Key}  ${object.Size} B  ${object.CacheControl}`);
}

if (!apply) {
  console.log('Re-run with --apply to rewrite them as private, no-store.');
  process.exit(0);
}

let rewritten = 0;
for (const object of offenders) {
  const current = await client.send(new GetObjectCommand({ Bucket: bucket, Key: object.Key }));
  const body = await bodyBytes(current);
  const contentLength = Number(current.ContentLength ?? body.length);
  if (body.length !== contentLength) {
    throw new Error(`${object.Key}: read ${body.length} B but R2 reports ${contentLength} B`);
  }
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: object.Key,
    Body: body,
    ContentType: current.ContentType ?? 'application/octet-stream',
    ContentLength: contentLength,
    CacheControl: PRIVATE_CACHE_CONTROL,
  }));
  rewritten += 1;
  console.log(`  rewritten ${object.Key}`);
}

console.log(`rewrote ${rewritten} object(s) to ${PRIVATE_CACHE_CONTROL}`);
