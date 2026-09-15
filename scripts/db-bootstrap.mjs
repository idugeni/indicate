/**
 * Regenerates `src/data/migrations/bootstrap/indicate-schema.sql` from the
 * reviewed forward migrations in journal order.
 *
 * Reverse-engineered from the committed bootstrap and verified byte-for-byte
 * (modulo stray CR artifacts): header digests are SHA-256 over each raw
 * migration file, bodies are concatenated with `--> statement-breakpoint`
 * markers stripped, and each section closes with a drizzle ledger row whose
 * hash is the same digest and whose timestamp is the journal `when`.
 *
 * Usage:
 *   node scripts/db-bootstrap.mjs [--out <path>] [--through <tag>] [--check]
 *
 * `--check` regenerates in memory and fails when the output differs from the
 * file on disk. Run with a migration-owner credential context in mind; the
 * emitted SQL itself must be applied with one, never a runtime credential.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'src', 'data', 'migrations');
const JOURNAL_PATH = join(MIGRATIONS_DIR, 'meta', '_journal.json');
const DEFAULT_OUT = join(MIGRATIONS_DIR, 'bootstrap', 'indicate-schema.sql');
const MARKER = '--> statement-breakpoint';

const HEADER_PROSE = [
  '-- Indicate database bootstrap',
  '--',
  '-- GENERATED FILE. Do not edit by hand; run `npm run db:bootstrap` instead.',
  '--',
  '-- Applies the complete reviewed forward migration sequence to one empty',
  '-- PostgreSQL 17 database and records the Drizzle ledger, so a later',
  '-- `npm run db:migrate` against the same database is a no-op. Run this with a',
  '-- migration-owner credential, never an application runtime credential.',
  '--',
  '-- The digests below are the Drizzle ledger digests: SHA-256 over each raw',
  '-- migration file. They are deliberately distinct from the reviewed checksums',
  '-- in src/features/release/migration-manifest.ts, which canonicalize each body',
  '-- before hashing. Both are verified against these files by the test suite.',
  '--',
];

const PREAMBLE = [
  'BEGIN;',
  '',
  'CREATE SCHEMA IF NOT EXISTS drizzle;',
  'CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (',
  '  id SERIAL PRIMARY KEY,',
  '  hash text NOT NULL,',
  '  created_at bigint',
  ');',
  '',
  '-- Fail closed rather than replaying reviewed migrations over existing state.',
  'DO $bootstrap$',
  'BEGIN',
  '  IF EXISTS (SELECT 1 FROM drizzle."__drizzle_migrations") THEN',
  "    RAISE EXCEPTION 'indicate_bootstrap_requires_empty_database';",
  '  END IF;',
  'END',
  '$bootstrap$;',
];

function sha256Hex(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

function fail(message) {
  console.error(`db:bootstrap: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, through: null, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--out') {
      args.out = argv[index + 1] ?? fail('missing value for --out');
      index += 1;
    } else if (token === '--through') {
      args.through = argv[index + 1] ?? fail('missing value for --through');
      index += 1;
    } else if (token === '--check') {
      args.check = true;
    } else {
      fail(`unknown argument: ${token}`);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8'));
  const entries = [...(journal.entries ?? [])].sort((a, b) => a.idx - b.idx);
  if (entries.length === 0) fail('journal has no entries');
  const scoped = args.through === null ? entries : entries.slice(0, entries.findIndex((entry) => entry.tag === args.through) + 1);
  if (scoped.length === 0 || (args.through !== null && scoped[scoped.length - 1].tag !== args.through)) {
    fail(`tag not found in journal: ${args.through}`);
  }
  const sections = scoped.map((entry, position) => {
    const version = position + 1;
    let raw;
    try {
      raw = readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`));
    } catch {
      fail(`migration file missing for journal tag: ${entry.tag}`);
    }
    const digest = sha256Hex(raw);
    const body = raw
      .toString('utf8')
      .split(MARKER)
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/, '');
    const banner = ['-- ----------------------------------------------------------------------', `-- ${entry.tag}`, '-- ----------------------------------------------------------------------'].join('\n');
    const ledger = `INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('${digest}', ${entry.when});`;
    return { version, tag: entry.tag, digest, block: `${banner}\n${body}\n\n${ledger}\n` };
  });
  const header = [
    ...HEADER_PROSE,
    `-- Reviewed sources, in journal order (${sections.length} migrations):`,
    ...sections.map((section) => `--   ${String(section.version).padStart(2, '0')}  ${section.tag}  ledger sha256:${section.digest}`),
    '',
    ...PREAMBLE,
  ].join('\n');
  const output = `${header}\n${sections.map((section) => section.block).join('\n')}COMMIT;\n`;
  if (args.check) {
    const current = readFileSync(args.out, 'utf8');
    if (current !== output) fail(`bootstrap drift detected: regenerate with npm run db:bootstrap (${args.out})`);
    console.log(`db:bootstrap: in sync (${sections.length} migrations)`);
    return;
  }
  writeFileSync(args.out, output);
  console.log(`db:bootstrap: wrote ${sections.length} migrations to ${args.out}`);
}

main();
