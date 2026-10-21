import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertSchemaGate } from '@/core/config/runtime/runtime-context';
import { CURRENT_REQUIRED_SCHEMA_VERSION } from '@/data/schema-version';

type GateClient = Parameters<typeof assertSchemaGate>[0];

interface Recorded {
  readonly sql: string;
}

function gateClient(responses: readonly (readonly unknown[])[], recorded?: Recorded[]): GateClient {
  let cursor = 0;
  const fake = async <T>(strings: TemplateStringsArray): Promise<readonly T[]> => {
    recorded?.push({ sql: strings.join('?') });
    const row = responses[Math.min(cursor, responses.length - 1)] ?? [];
    cursor += 1;
    return row as unknown as readonly T[];
  };
  return fake as unknown as GateClient;
}

describe('assertSchemaGate', () => {
  it('keeps the code contract aligned with the migration journal', () => {
    const journal = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/data/migrations/meta/_journal.json'), 'utf8'),
    ) as { readonly entries: readonly unknown[] };
    expect(CURRENT_REQUIRED_SCHEMA_VERSION).toBe(journal.entries.length);
  });

  it('enforces the code-required version even when the database gate has no row', async () => {
    const recorded: Recorded[] = [];
    const client = gateClient(
      [[], [{ applied_version: 290, applied_at: '2026-10-17T13:10:00.000Z' }]],
      recorded,
    );
    await expect(assertSchemaGate(client)).rejects.toThrow(
      'schema_gate_unsatisfied: applied=290 required=292 applied_at=2026-10-17T13:10:00.000Z',
    );
    expect(recorded.filter((query) => query.sql.includes('INSERT INTO public.migration_gate_events'))).toHaveLength(1);
  });

  it('passes without a database gate when the ledger satisfies this release', async () => {
    const client = gateClient([[], [{ applied_version: 292, applied_at: '2026-10-20T13:18:26.127Z' }]]);
    await expect(assertSchemaGate(client)).resolves.toBeUndefined();
  });

  it('honors a higher database-required version than the code minimum', async () => {
    const client = gateClient([
      [{ required_version: 300 }],
      [{ applied_version: 299, applied_at: '2026-10-20T13:18:26.127Z' }],
    ]);
    await expect(assertSchemaGate(client)).rejects.toThrow(
      'schema_gate_unsatisfied: applied=299 required=300 applied_at=2026-10-20T13:18:26.127Z',
    );
  });

  it('does not mask refusal when failure evidence cannot be written', async () => {
    let call = 0;
    const fake = async <T>(): Promise<readonly T[]> => {
      call += 1;
      if (call === 1) return [{ required_version: 300 }] as unknown as readonly T[];
      if (call === 2) return [{ applied_version: 299, applied_at: null }] as unknown as readonly T[];
      throw new Error('evidence write denied');
    };
    await expect(assertSchemaGate(fake as unknown as GateClient)).rejects.toThrow(
      'schema_gate_unsatisfied: applied=299 required=300 applied_at=unknown',
    );
  });

  it('keeps production build schema validation read-only', async () => {
    const previousPhase = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = 'phase-production-build';
    const recorded: Recorded[] = [];
    try {
      const client = gateClient(
        [[], [{ applied_version: 290, applied_at: '2026-10-17T13:10:00.000Z' }]],
        recorded,
      );
      await expect(assertSchemaGate(client)).rejects.toThrow(
        'schema_gate_unsatisfied: applied=290 required=292 applied_at=2026-10-17T13:10:00.000Z',
      );
      expect(recorded.some((query) => query.sql.includes('INSERT INTO public.migration_gate_events'))).toBe(false);
    } finally {
      if (previousPhase === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = previousPhase;
    }
  });

  it('treats an empty ledger as version zero', async () => {
    await expect(assertSchemaGate(gateClient([[], []]))).rejects.toThrow(
      'schema_gate_unsatisfied: applied=0 required=292 applied_at=unknown',
    );
  });
});
