// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { NewsletterForm } from '@/modules/site/components/network/ui/newsletter-form';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(ok: boolean) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok }) as Response));
}

describe('NewsletterForm', () => {
  it('mengirim email ke intake tenant dan menampilkan status berhasil', async () => {
    stubFetch(true);
    render(
      <NewsletterForm inputId="test-email" formClassName="row" inputClassName="input" buttonClassName="button" />,
    );
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'reader@contoh.id' } });
    fireEvent.click(screen.getByRole('button', { name: 'Berlangganan' }));
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/network/newsletter', expect.objectContaining({ method: 'POST' }));
      expect(screen.getByText('Berhasil! Cek email untuk konfirmasi.')).toBeDefined();
    });
  });

  it('menampilkan status gagal saat intake menolak', async () => {
    stubFetch(false);
    render(
      <NewsletterForm inputId="test-email" formClassName="row" inputClassName="input" buttonClassName="button" />,
    );
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'reader@contoh.id' } });
    fireEvent.click(screen.getByRole('button', { name: 'Berlangganan' }));
    await vi.waitFor(() => {
      expect(screen.getByText('Gagal berlangganan. Coba lagi nanti.')).toBeDefined();
    });
  });
});
