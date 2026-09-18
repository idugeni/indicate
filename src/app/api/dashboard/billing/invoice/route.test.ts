import { describe, expect, it } from 'vitest';

import type { InvoiceRecord } from '@/modules/billing/models';
import { esc, formatDate, formatIdr, invoiceDocument } from '@/app/api/dashboard/billing/invoice/[id]/route';

const BASE: InvoiceRecord = {
  id: 'inv-1',
  organizationId: 'org-1',
  organizationName: 'Portal Berita',
  number: 'INV-2026-001',
  amountIdr: 1500000,
  currency: 'IDR',
  status: 'paid',
  paidAt: '2026-09-01T00:00:00.000Z',
  billingNote: null,
  voidedAt: null,
  voidReason: null,
  version: 2,
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('esc', () => {
  it('meloloskan markup suntikan', () => {
    expect(esc('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(esc('a&b')).toBe('a&amp;b');
  });
});

describe('formatIdr', () => {
  it('memformat rupiah dengan awalan Rp', () => {
    expect(formatIdr(1500000)).toBe('Rp1.500.000');
  });
});

describe('formatDate', () => {
  it('mengembalikan input apa adanya saat tak terparse', () => {
    expect(formatDate('bukan-tanggal')).toBe('bukan-tanggal');
  });

  it('memformat ISO ke tanggal panjang id-ID', () => {
    expect(formatDate('2026-09-01T00:00:00.000Z')).toContain('2026');
  });
});

describe('invoiceDocument', () => {
  it('merender lencana paid dengan saldo nol', () => {
    const html = invoiceDocument(BASE);
    expect(html).toContain('badge paid');
    expect(html).toContain('Balance due');
    expect(html).toContain('INV-2026-001');
  });

  it('merender lencana void beserta alasan yang diescape', () => {
    const html = invoiceDocument({ ...BASE, status: 'voided', voidedAt: '2026-09-02T00:00:00.000Z', voidReason: '<batal>' });
    expect(html).toContain('badge void');
    expect(html).toContain('&lt;batal&gt;');
    expect(html).not.toContain('<batal>');
  });

  it('meng-escape nama organisasi dan nomor', () => {
    const html = invoiceDocument({ ...BASE, organizationName: '<img src=x>', number: 'INV-"1"' });
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).toContain('INV-&quot;1&quot;');
  });
});
