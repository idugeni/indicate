// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useRef, useState } from 'react';

import { BlackLimeSearchPanel } from '@/modules/site/components/network/templates/black-lime/chrome/search-panel';

const dorong = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: dorong }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  dorong.mockClear();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((tambat) => {
    tambat(0);
    return 0;
  });
});

function PanelUji({ tutup }: { readonly tutup: () => void }) {
  const [nilai, setNilai] = useState('');
  const rujukan = useRef<HTMLInputElement>(null);
  return (
    <BlackLimeSearchPanel
      query={nilai}
      onQueryChange={setNilai}
      onClose={tutup}
      inputRef={rujukan}
      onFocusReturn={vi.fn()}
    />
  );
}

function rujukanKosong() {
  return createRef<HTMLInputElement>();
}

describe('BlackLimeSearchPanel', () => {
  it('mengetik memperbarui nilai', () => {
    render(<PanelUji tutup={vi.fn()} />);
    const masukan = screen.getByLabelText('Cari berita');
    fireEvent.change(masukan, { target: { value: 'banjir' } });
    expect((masukan as HTMLInputElement).value).toBe('banjir');
  });

  it('submit mengarahkan dengan query', () => {
    render(<PanelUji tutup={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Cari berita'), { target: { value: 'banjir besar' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(dorong).toHaveBeenCalledWith('/search?q=banjir%20besar');
  });

  it('submit kosong mengarah ke pencarian umum', () => {
    render(
      <BlackLimeSearchPanel
        query="   "
        onQueryChange={vi.fn()}
        onClose={vi.fn()}
        inputRef={rujukanKosong()}
        onFocusReturn={vi.fn()}
      />,
    );
    fireEvent.submit(screen.getByRole('search'));
    expect(dorong).toHaveBeenCalledWith('/search');
  });

  it('menutup lewat Escape dan tombol tutup', () => {
    const tutup = vi.fn();
    render(<PanelUji tutup={tutup} />);
    fireEvent.keyDown(screen.getByLabelText('Cari berita'), { key: 'Escape' });
    expect(tutup).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pencarian' }));
    expect(tutup).toHaveBeenCalledTimes(2);
  });
});
