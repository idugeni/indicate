// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useRef, useState } from 'react';

import { RedEditorialSearchPanel } from '@/modules/site/components/network/templates/red-editorial/chrome/search-panel';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  pushMock.mockClear();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
    frame(0);
    return 0;
  });
});

function TestPanel({ onClose }: { readonly onClose: () => void }) {
  const [value, setValue] = useState('');
  const fieldRef = useRef<HTMLInputElement>(null);
  return (
    <RedEditorialSearchPanel
      query={value}
      onQueryChange={setValue}
      onClose={onClose}
      inputRef={fieldRef}
      onFocusReturn={vi.fn()}
    />
  );
}

function emptyRef() {
  return createRef<HTMLInputElement>();
}

describe('RedEditorialSearchPanel', () => {
  it('mengetik memperbarui nilai', () => {
    render(<TestPanel onClose={vi.fn()} />);
    const searchInput = screen.getByLabelText('Cari berita');
    fireEvent.change(searchInput, { target: { value: 'banjir' } });
    expect((searchInput as HTMLInputElement).value).toBe('banjir');
  });

  it('submit mengarahkan dengan query', () => {
    render(<TestPanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Cari berita'), { target: { value: 'banjir besar' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(pushMock).toHaveBeenCalledWith('/search?q=banjir%20besar');
  });

  it('submit kosong mengarah ke pencarian umum', () => {
    render(
      <RedEditorialSearchPanel
        query="   "
        onQueryChange={vi.fn()}
        onClose={vi.fn()}
        inputRef={emptyRef()}
        onFocusReturn={vi.fn()}
      />,
    );
    fireEvent.submit(screen.getByRole('search'));
    expect(pushMock).toHaveBeenCalledWith('/search');
  });

  it('menutup lewat Escape dan tombol tutup', () => {
    const onClose = vi.fn();
    render(<TestPanel onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText('Cari berita'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pencarian' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
