import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(process.cwd(), 'src', 'data', 'migrations');
const LEDGER_ROW = /VALUES\s*\((\d+),\s*'([a-z_]+)',\s*'sha256:([0-9a-f]{64})'\)/;

const ZEROS = '0'.repeat(64);

/**
 * Digest a migration the way the ledger rows in this directory are defined:
 * LF-normalised bytes with the file's own checksum literal replaced by zeros.
 *
 * @param text - Raw file contents.
 * @returns Hex SHA-256 of the normalised body.
 */
function bodyDigest(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/sha256:[0-9a-f]{64}/g, `sha256:${ZEROS}`);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql') && !name.startsWith('bootstrap'))
    .sort();
}

describe('Integritas digest migrasi', () => {
  const files = migrationFiles();

  it('memuat seluruh file migrasi', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('setiap ledger row mencocokkan digest badannya sendiri', () => {
    const drifted: string[] = [];
    for (const file of files) {
      const text = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const match = LEDGER_ROW.exec(text.replace(/\r\n/g, '\n'));
      if (match === null) continue;
      if (match[3] !== bodyDigest(text)) drifted.push(`${file} (v${match[1]} ${match[2]})`);
    }
    expect(drifted).toEqual([]);
  });

  it('tidak ada nomor versi yang dipakai dua kali', () => {
    const versions = new Map<number, string>();
    const duplicates: string[] = [];
    for (const file of files) {
      const text = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const match = LEDGER_ROW.exec(text);
      if (match === null) continue;
      const version = Number(match[1]);
      const previous = versions.get(version);
      if (previous !== undefined) duplicates.push(`v${version}: ${previous} dan ${file}`);
      else versions.set(version, file);
    }
    expect(duplicates).toEqual([]);
  });
});
