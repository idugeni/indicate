import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { invoiceDocument } from '@/app/api/dashboard/billing/invoice/[id]/route';
import type { InvoiceRecord } from '@/modules/billing/models';
import { watermarkStamp } from '@/modules/billing/seal-watermark';

const TTD_PATH =
  'E:\\PT SANCA PHENA CAKRA\\00_Administrasi_Dokumen\\TTD_dan_Stempel\\2026-09-07_TTD-Direktur-Eliyanto-Sarage_Transparan.png';
const STAMP_PATH =
  'E:\\PT SANCA PHENA CAKRA\\00_Administrasi_Dokumen\\TTD_dan_Stempel\\2026-09-07_Stempel-LUNAS-Terima-Kasih_Transparan.png';

const SAMPLE: InvoiceRecord = {
  id: '00000000-0000-0000-0000-000000000000',
  organizationId: '00000000-0000-0000-0000-000000000000',
  organizationName: 'PT Contoh Maju Bersama (PRATINJAU)',
  number: 'IND-XXXXX-0000-0000-SAMPLE',
  amountIdr: 550000,
  currency: 'IDR',
  status: 'paid',
  paidAt: '2026-10-01T00:00:00.000Z',
  dueAt: null,
  billingNote: null,
  paymentMethod: 'Transfer bank',
  voidedAt: null,
  voidReason: null,
  version: 1,
  createdAt: '2026-10-04T08:00:00.000Z',
};

describe('pratinjau invoice SAMPLE', () => {
  it('merender via invoiceDocument asli dan menulis HTML', async () => {
    const ttd = readFileSync(TTD_PATH);
    const stampRaw = readFileSync(STAMP_PATH);
    const stamp = await watermarkStamp(new Uint8Array(stampRaw), SAMPLE.number);
    const dataUrl = (bytes: Uint8Array | Buffer): string =>
      `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
    const html = invoiceDocument(SAMPLE, { signUrl: dataUrl(ttd), stampUrl: dataUrl(stamp) });
    expect(html).toContain('IND-XXXXX-0000-0000-SAMPLE');
    expect(html).toContain('Lima Ratus Lima Puluh Ribu Rupiah');
    const outDir = 'C:\\Users\\rifqi\\AppData\\Local\\Temp\\opencode';
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}\\invoice-pratinjau-SAMPLE.html`, html);
  });
});
