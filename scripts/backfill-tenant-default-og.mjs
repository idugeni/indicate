/**
 * Backfill per-site static OG cards and quarantine the shared ministry logo.
 *
 * Every active tenant site gets its own 1200x630 glass-style card (portal
 * name + tagline) uploaded to the private R2 bucket as `site-default`
 * media; `site_settings.default_media_id` is then repointed at it via the
 * emitted SQL file (applied separately with the direct credential). The
 * legacy shared logo media row is deleted afterwards so tenant OG can
 * never resolve to it again.
 *
 * Modes (database writes never happen from this script; it only renders,
 * uploads bytes to R2, and emits SQL):
 *   node scripts/backfill-tenant-default-og.mjs --sites <sites.json>
 *     renders PNG previews to `tmp/tenant-og/` (no R2, no SQL).
 *   node scripts/backfill-tenant-default-og.mjs --sites <sites.json> --upload
 *     renders, PUTs each PNG to R2, and writes
 *     `scripts/backfill-tenant-default-og.sql` (INSERT media + UPDATE
 *     site_settings + logo quarantine, guarded to logo/NULL defaults).
 *   node scripts/backfill-tenant-default-og.mjs --delete-object --bucket <b> --key <k>
 *     deletes one R2 object (used for the quarantined logo bytes).
 *
 * `<sites.json>` shape: [{ site_id, org_id, hostname, name, tagline }].
 * R2 coordinates come from `--account <id> --bucket <name>`; credentials
 * from the repo `.env` (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'node:module';
import React from 'react';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { ImageResponse } = require('next/og');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO_MEDIA_ID = 'c11126ca-7316-4eb2-a19d-552b3cec021d';
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

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

function fitTitleSize(name) {
  const len = Array.from(name).length;
  return Math.max(44, Math.min(74, Math.floor(880 / Math.max(1, len * 0.56))));
}

function tenantCard({ eyebrow, title }) {
  const titleSize = fitTitleSize(title);
  return React.createElement(
    'div',
    {
      style: {
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #f6f3ea 0%, #ece3cf 55%, #e0d3b8 100%)',
        fontFamily: 'sans-serif', padding: '64px', overflow: 'hidden',
      },
    },
    React.createElement('div', { style: { position: 'absolute', width: '520px', height: '520px', left: '-140px', top: '-160px', borderRadius: '999px', backgroundColor: 'rgba(204, 154, 68, 0.38)' } }),
    React.createElement('div', { style: { position: 'absolute', width: '260px', height: '260px', right: '120px', top: '-80px', borderRadius: '999px', backgroundColor: 'rgba(228, 185, 106, 0.45)' } }),
    React.createElement('div', { style: { position: 'absolute', width: '620px', height: '620px', right: '-180px', bottom: '-220px', borderRadius: '999px', backgroundColor: 'rgba(26, 36, 48, 0.12)' } }),
    React.createElement(
      'div',
      {
        style: {
          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.66)',
          border: '1px solid rgba(255, 255, 255, 0.9)', borderRadius: '28px',
          boxShadow: '0 32px 80px rgba(26, 36, 48, 0.18)', padding: '48px 64px', textAlign: 'center', overflow: 'hidden',
        },
      },
      React.createElement('div', { style: { position: 'absolute', top: '0px', left: '0px', right: '0px', height: '120px', background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0))' } }),
      React.createElement('div', { style: { position: 'relative', display: 'flex', alignItems: 'center', border: '1.5px solid #b88d3a', borderRadius: '999px', color: '#8a5f1c', fontSize: '19px', fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', padding: '10px 26px 10px 30px' } }, eyebrow),
      React.createElement('div', { style: { position: 'relative', marginTop: '28px', color: '#1a2430', fontSize: `${titleSize}px`, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.025em' } }, title),
      React.createElement('div', { style: { position: 'relative', marginTop: '30px', width: '72px', height: '4px', backgroundColor: '#b88d3a', borderRadius: '999px' } }),
    ),
  );
}

async function renderCard(site) {
  const eyebrow = (site.tagline ?? 'Portal Berita').trim() || 'Portal Berita';
  const title = site.name.trim();
  const png = Buffer.from(await new ImageResponse(tenantCard({ eyebrow, title }), { width: CARD_WIDTH, height: CARD_HEIGHT }).arrayBuffer());
  const meta = await sharp(png).metadata();
  if (meta.width !== CARD_WIDTH || meta.height !== CARD_HEIGHT || meta.format !== 'png') {
    throw new Error(`render_mismatch:${site.hostname}`);
  }
  return png;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const index = args.indexOf(flag);
    return index < 0 || index + 1 >= args.length ? null : args[index + 1];
  };
  if (args.includes('--delete-object')) {
    loadEnvFile(join(ROOT, '.env'));
    const bucket = getArg('--bucket');
    const key = getArg('--key');
    const account = getArg('--account');
    if (!bucket || !key || !account) throw new Error('usage: --delete-object --account <id> --bucket <name> --key <key>');
    const s3 = r2Client(account);
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`deleted r2://${bucket}/${key}`);
    return;
  }
  const sitesPath = getArg('--sites');
  if (!sitesPath) throw new Error('usage: --sites <sites.json> [--upload --account <id> --bucket <name>]');
  const sites = JSON.parse(readFileSync(sitesPath, 'utf8'));
  console.log(`targets: ${sites.length} sites`);

  const previewDir = join(ROOT, 'tmp', 'tenant-og');
  mkdirSync(previewDir, { recursive: true });
  const rendered = [];
  for (const site of sites) {
    const png = await renderCard(site);
    writeFileSync(join(previewDir, `${site.hostname}.png`), png);
    rendered.push({ site, png, checksum: createHash('sha256').update(png).digest('hex') });
  }
  console.log(`preview written to tmp/tenant-og/ (${rendered.length} files)`);

  if (!args.includes('--upload')) return;

  const account = getArg('--account');
  const bucket = getArg('--bucket');
  if (!account || !bucket) throw new Error('--upload requires --account <id> --bucket <name>');
  loadEnvFile(join(ROOT, '.env'));
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2 credentials missing');
  const s3 = r2Client(account);
  const now = new Date();
  const ymd = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  const statements = [
    `-- Tenant default OG backfill (${rendered.length} sites), generated ${now.toISOString()}.`,
    `-- Guarded: only rows still pointing at the legacy logo (or NULL) are repointed.`,
    'BEGIN;',
  ];
  for (const { site, png, checksum } of rendered) {
    const token = randomBytes(8).toString('hex');
    const key = `o/${site.org_id}/p/site-default/y=${now.getUTCFullYear()}/m=${String(now.getUTCMonth() + 1).padStart(2, '0')}/site/${site.site_id}/${ymd}-og-default-${token}.png`;
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: png, ContentType: 'image/png' }));
    const mediaId = randomUUID();
    const stamp = now.toISOString();
    statements.push(
      `INSERT INTO media (organization_id, id, object_key, purpose, media_type, size_bytes, checksum, thumb_object_key, width_px, height_px, license_source, attribution, state, article_id, site_id, organization_asset, version, created_at, updated_at) VALUES ('${site.org_id}', '${mediaId}', '${key}', 'site-default', 'image/png', ${png.length}, '${checksum}', NULL, ${CARD_WIDTH}, ${CARD_HEIGHT}, NULL, NULL, 'active', NULL, '${site.site_id}', FALSE, 1, '${stamp}', '${stamp}');`,
      `UPDATE site_settings SET default_media_id = '${mediaId}', version = version + 1, updated_at = '${stamp}' WHERE organization_id = '${site.org_id}' AND site_id = '${site.site_id}' AND (default_media_id = '${LOGO_MEDIA_ID}' OR default_media_id IS NULL); -- ${site.hostname}`,
    );
    console.log(`uploaded ${site.hostname} -> ${mediaId}`);
  }
  statements.push(
    `-- Quarantine: only when nothing references the legacy logo anymore.`,
    `DELETE FROM media WHERE id = '${LOGO_MEDIA_ID}' AND NOT EXISTS (SELECT 1 FROM site_settings WHERE default_media_id = '${LOGO_MEDIA_ID}' OR logo_media_id = '${LOGO_MEDIA_ID}' OR favicon_media_id = '${LOGO_MEDIA_ID}') AND NOT EXISTS (SELECT 1 FROM articles WHERE lead_media_id = '${LOGO_MEDIA_ID}') AND NOT EXISTS (SELECT 1 FROM article_sites WHERE custom_image_media_id = '${LOGO_MEDIA_ID}');`,
    'COMMIT;',
  );
  const outPath = join(ROOT, 'scripts', 'backfill-tenant-default-og.sql');
  writeFileSync(outPath, `${statements.join('\n')}\n`);
  console.log(`sql written to scripts/backfill-tenant-default-og.sql`);
}

function r2Client(account) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
