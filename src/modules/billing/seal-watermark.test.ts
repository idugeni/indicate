import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { watermarkStamp } from '@/modules/billing/seal-watermark';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('watermarkStamp', () => {
  it('membakar nomor ke PNG stempel', async () => {
    const raw = new Uint8Array(await readFile(join(process.cwd(), 'public', 'brand', 'safenca-mark-white-transparent.png')));
    const marked = await watermarkStamp(raw, 'IND-0AD4A-2609-0047-Q2M9');
    expect(Buffer.from(marked.subarray(0, 4)).equals(PNG_MAGIC)).toBe(true);
    expect(marked.length).toBeGreaterThan(0);
    expect(Buffer.from(marked).equals(Buffer.from(raw))).toBe(false);
  });

  it('menolak citra rusak', async () => {
    await expect(watermarkStamp(new Uint8Array([1, 2, 3]), 'IND-1')).rejects.toThrow();
  });
});
