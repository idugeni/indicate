import { describe, expect, it } from 'vitest';

import { assertSchemaGate } from '@/core/config/runtime/runtime-context';

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
  it('melewatkan proses ketika gate tidak dipersenjaga', async () => {
    await expect(assertSchemaGate(gateClient([[]]))).resolves.toBeUndefined();
  });

  it('melewatkan proses ketika ledger sudah memenuhi versi wajib', async () => {
    const client = gateClient([[{ required_version: 194 }], [{ applied_version: 194, applied_at: '2026-09-25T17:29:02.102670Z' }]]);
    await expect(assertSchemaGate(client)).resolves.toBeUndefined();
  });

  it('menolak dan mencatat versi yang benar-benar terpasang', async () => {
    const recorded: Recorded[] = [];
    const client = gateClient(
      [[{ required_version: 194 }], [{ applied_version: 191, applied_at: '2026-09-25T17:00:00.000000Z' }]],
      recorded,
    );
    await expect(assertSchemaGate(client)).rejects.toThrow(
      'schema_gate_unsatisfied: applied=191 required=194 applied_at=2026-09-25T17:00:00.000000Z',
    );
    expect(recorded.filter((query) => query.sql.includes('INSERT INTO public.migration_gate_events'))).toHaveLength(1);
  });

  it('tetap menolak meski bukti gagal ditulis', async () => {
    let call = 0;
    const fake = async <T>(): Promise<readonly T[]> => {
      call += 1;
      if (call === 1) return [{ required_version: 200 }] as unknown as readonly T[];
      if (call === 2) return [{ applied_version: 194, applied_at: null }] as unknown as readonly T[];
      throw new Error('evidence write denied');
    };
    await expect(assertSchemaGate(fake as unknown as GateClient)).rejects.toThrow(
      'schema_gate_unsatisfied: applied=194 required=200',
    );
  });

  it('menolak tanpa ledger sama sekali', async () => {
    await expect(assertSchemaGate(gateClient([[{ required_version: 190 }], []]))).rejects.toThrow(
      'schema_gate_unsatisfied: applied=0 required=190 applied_at=unknown',
    );
  });
});
