// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { useRovingSelection } from '@/ui/hooks/use-roving-selection';

afterEach(() => {
  cleanup();
});

const NILAI = ['satu', 'dua', 'tiga'] as const;
type Nilai = (typeof NILAI)[number];

function Probe({ onPilih }: { onPilih?: (nilai: Nilai) => void }) {
  const [aktif, setAktif] = useState<Nilai>('satu');
  const { register, tabIndexFor, onKeyDown } = useRovingSelection(NILAI, aktif, (nilai) => {
    setAktif(nilai);
    onPilih?.(nilai);
  });
  return (
    <div role="tablist" onKeyDown={onKeyDown}>
      {NILAI.map((nilai) => (
        <button key={nilai} ref={register(nilai)} tabIndex={tabIndexFor(nilai)} type="button">
          {nilai}
        </button>
      ))}
    </div>
  );
}

function tombol(nama: string) {
  return screen.getByRole('button', { name: nama });
}

describe('useRovingSelection', () => {
  it('memberi tabIndex nol hanya pada nilai aktif', () => {
    render(<Probe />);
    expect(tombol('satu').tabIndex).toBe(0);
    expect(tombol('dua').tabIndex).toBe(-1);
    expect(tombol('tiga').tabIndex).toBe(-1);
  });

  it('memindahkan pilihan ke kanan dan memfokuskan tombolnya', () => {
    const onPilih = vi.fn();
    render(<Probe onPilih={onPilih} />);
    fireEvent.keyDown(tombol('satu'), { key: 'ArrowRight' });
    expect(onPilih).toHaveBeenCalledWith('dua');
    expect(document.activeElement).toBe(tombol('dua'));
    expect(tombol('dua').tabIndex).toBe(0);
  });

  it('membungkus panah kiri dari awal ke akhir', () => {
    const onPilih = vi.fn();
    render(<Probe onPilih={onPilih} />);
    fireEvent.keyDown(tombol('satu'), { key: 'ArrowLeft' });
    expect(onPilih).toHaveBeenCalledWith('tiga');
    expect(document.activeElement).toBe(tombol('tiga'));
  });

  it('melompat lewat Home dan End', () => {
    const onPilih = vi.fn();
    render(<Probe onPilih={onPilih} />);
    fireEvent.keyDown(tombol('satu'), { key: 'End' });
    expect(onPilih).toHaveBeenCalledWith('tiga');
    fireEvent.keyDown(tombol('tiga'), { key: 'Home' });
    expect(onPilih).toHaveBeenCalledWith('satu');
  });

  it('mengabaikan tombol selain navigasi', () => {
    const onPilih = vi.fn();
    render(<Probe onPilih={onPilih} />);
    fireEvent.keyDown(tombol('satu'), { key: 'a' });
    expect(onPilih).not.toHaveBeenCalled();
    expect(tombol('satu').tabIndex).toBe(0);
  });
});
