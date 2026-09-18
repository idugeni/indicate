// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PublisherForm } from '@/modules/dashboard/components/editorial/publisher-form';

afterEach(() => {
  cleanup();
});

const DATA = {
  publishers: [{ id: 'pub-1', name: 'Radar Banyumas', verificationStatus: 'pending', version: 3 }],
  sites: [],
};

function setup(command: (action: string, payload: unknown) => Promise<unknown>) {
  return render(<PublisherForm data={DATA} command={command} />);
}

describe('PublisherForm attribution suggestion', () => {
  it('mengisi label atribusi saat nama blur', () => {
    setup(vi.fn(async () => undefined));
    const name = screen.getByPlaceholderText(/radar jawa tengah sentral/i);
    fireEvent.change(name, { target: { value: 'RUTAN KELAS II B WONOSOBO' } });
    fireEvent.change(screen.getByLabelText(/klasifikasi entitas/i), { target: { value: 'government_institution' } });
    fireEvent.blur(name);
    expect((screen.getByPlaceholderText(/redaksi wonosobo news/i) as HTMLInputElement).value).toBe('Humas Rutan Wonosobo');
  });

  it('mempertahankan label yang ditulis manual', () => {
    setup(vi.fn(async () => undefined));
    const name = screen.getByPlaceholderText(/radar jawa tengah sentral/i);
    const attribution = screen.getByPlaceholderText(/redaksi wonosobo news/i);
    fireEvent.change(attribution, { target: { value: 'Label Manual' } });
    fireEvent.change(name, { target: { value: 'RUTAN KELAS II B WONOSOBO' } });
    fireEvent.blur(name);
    expect((attribution as HTMLInputElement).value).toBe('Label Manual');
  });
});

describe('PublisherForm submit', () => {
  it('mendaftarkan penerbit dan mereset form', async () => {
    const command = vi.fn(async () => ({ id: 'pub-9' }));
    setup(command);
    const name = screen.getByPlaceholderText(/radar jawa tengah sentral/i);
    fireEvent.change(name, { target: { value: 'Radar Banyumas' } });
    fireEvent.blur(name);
    fireEvent.click(screen.getByRole('button', { name: /daftarkan penerbit/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publisher.create',
      expect.objectContaining({ name: 'Radar Banyumas', type: 'independent_publisher', contacts: {} }),
    ));
    expect((screen.getByPlaceholderText(/radar jawa tengah sentral/i) as HTMLInputElement).value).toBe('');
  });

  it('memverifikasi penerbit terpilih dengan versinya', async () => {
    const command = vi.fn(async () => ({ id: 'pub-1' }));
    setup(command);
    const decision = screen.getByLabelText(/keputusan redaksi/i);
    fireEvent.change(decision, { target: { value: 'publisher.approve' } });
    fireEvent.click(screen.getByRole('button', { name: /terapkan resolusi status/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publisher.approve',
      expect.objectContaining({ id: 'pub-1', expectedVersion: 3 }),
    ));
  });
});
