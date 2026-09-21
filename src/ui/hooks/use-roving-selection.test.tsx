// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { useRovingSelection } from '@/ui/hooks/use-roving-selection';

afterEach(() => {
  cleanup();
});

const VALUES = ['satu', 'dua', 'tiga'] as const;
type Value = (typeof VALUES)[number];

function Probe({ onSelect }: { onSelect?: (value: Value) => void }) {
  const [active, setActive] = useState<Value>('satu');
  const { register, tabIndexFor, onKeyDown } = useRovingSelection(VALUES, active, (value) => {
    setActive(value);
    onSelect?.(value);
  });
  return (
    <div role="tablist" onKeyDown={onKeyDown}>
      {VALUES.map((value) => (
        <button key={value} ref={register(value)} tabIndex={tabIndexFor(value)} type="button">
          {value}
        </button>
      ))}
    </div>
  );
}

function getButton(name: string) {
  return screen.getByRole('button', { name });
}

describe('useRovingSelection', () => {
  it('memberi tabIndex nol hanya pada nilai aktif', () => {
    render(<Probe />);
    expect(getButton('satu').tabIndex).toBe(0);
    expect(getButton('dua').tabIndex).toBe(-1);
    expect(getButton('tiga').tabIndex).toBe(-1);
  });

  it('memindahkan pilihan ke kanan dan memfokuskan tombolnya', () => {
    const onSelect = vi.fn();
    render(<Probe onSelect={onSelect} />);
    fireEvent.keyDown(getButton('satu'), { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('dua');
    expect(document.activeElement).toBe(getButton('dua'));
    expect(getButton('dua').tabIndex).toBe(0);
  });

  it('membungkus panah kiri dari awal ke akhir', () => {
    const onSelect = vi.fn();
    render(<Probe onSelect={onSelect} />);
    fireEvent.keyDown(getButton('satu'), { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenCalledWith('tiga');
    expect(document.activeElement).toBe(getButton('tiga'));
  });

  it('melompat lewat Home dan End', () => {
    const onSelect = vi.fn();
    render(<Probe onSelect={onSelect} />);
    fireEvent.keyDown(getButton('satu'), { key: 'End' });
    expect(onSelect).toHaveBeenCalledWith('tiga');
    fireEvent.keyDown(getButton('tiga'), { key: 'Home' });
    expect(onSelect).toHaveBeenCalledWith('satu');
  });

  it('mengabaikan tombol selain navigasi', () => {
    const onSelect = vi.fn();
    render(<Probe onSelect={onSelect} />);
    fireEvent.keyDown(getButton('satu'), { key: 'a' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(getButton('satu').tabIndex).toBe(0);
  });
});
