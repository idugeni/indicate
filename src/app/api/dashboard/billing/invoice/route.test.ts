import { describe, expect, it } from 'vitest';

import type { InvoiceRecord } from '@/modules/billing/models';
import type { InvoiceSeals } from '@/app/api/dashboard/billing/invoice/[id]/route';
import { esc, formatDate, formatIdr, invoiceDocument } from '@/app/api/dashboard/billing/invoice/[id]/route';

const BASE: InvoiceRecord = {
  id: 'inv-1',
  organizationId: 'org-1',
  organizationName: 'Portal Berita',
  number: 'IND-0AD4A-2609-0047-Q2M9',
  amountIdr: 1500000,
  currency: 'IDR',
  status: 'paid',
  paidAt: '2026-09-01T00:00:00.000Z',
  billingNote: null,
  paymentMethod: 'Transfer bank',
  voidedAt: null,
  voidReason: null,
  version: 2,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const SEALS: InvoiceSeals = {
  signUrl: '/api/dashboard/billing/invoice/inv-1/seal?type=sign&organizationId=org-1',
  stampUrl: '/api/dashboard/billing/invoice/inv-1/seal?type=stamp&organizationId=org-1',
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
  it('merender lencana lunas dengan terbilang', () => {
    const html = invoiceDocument(BASE, SEALS);
    expect(html).toContain('badge-paid');
    expect(html).toContain('IND-0AD4A-2609-0047-Q2M9');
    expect(html).toContain('Satu Juta Lima Ratus Ribu Rupiah');
    expect(html).toContain('lang="id"');
  });

  it('merender lencana void beserta alasan yang diescape', () => {
    const html = invoiceDocument({ ...BASE, status: 'voided', voidedAt: '2026-09-02T00:00:00.000Z', voidReason: '<batal>' }, SEALS);
    expect(html).toContain('badge-void');
    expect(html).toContain('&lt;batal&gt;');
    expect(html).not.toContain('<batal>');
    expect(html).toContain('Dibatalkan pada');
  });

  it('meng-escape nama organisasi dan nomor', () => {
    const html = invoiceDocument({ ...BASE, organizationName: '<img src=x>', number: 'INV-"1"' }, SEALS);
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).toContain('INV-&quot;1&quot;');
  });

  it('meng-escape URL segel di atribut src', () => {
    const html = invoiceDocument(BASE, { ...SEALS, signUrl: '/seal?a=1&b=<x>' });
    expect(html).toContain('/seal?a=1&amp;b=&lt;x&gt;');
    expect(html).not.toContain('&b=<x>');
  });

  it('menampilkan catatan meterai saat ambang terlampaui', () => {
    const html = invoiceDocument({ ...BASE, amountIdr: 5_000_000 }, SEALS);
    expect(html).toContain('Lima Juta Rupiah');
    expect(html).toContain('meterai');
  });

  it('menampilkan metode pembayaran dari catatan berjalan', () => {
    const html = invoiceDocument({ ...BASE, paymentMethod: 'QRIS' }, SEALS);
    expect(html).toContain('QRIS');
  });

  it('menyembunyikan catatan meterai di bawah ambang', () => {
    expect(invoiceDocument(BASE, SEALS)).not.toContain('meterai');
  });
});
